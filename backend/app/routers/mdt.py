from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.database import get_db
from app.models.mdt import MDTCase, MDTComment, MDTStatus
from app.models.user import User
from app.core.rbac import require_permission
from app.core.audit import log_audit
from app.schemas.mdt import (
    MDTCaseCreate,
    MDTCaseOut,
    MDTCaseDetail,
    MDTCaseConclude,
    MDTCommentCreate,
    MDTCommentOut,
)

router = APIRouter(prefix="/mdt", tags=["MDT Board"])


def _enrich_case(case: MDTCase) -> dict:
    """Attach computed fields for the response schemas."""
    data = {
        "id": case.id,
        "patient_id": case.patient_id,
        "submitted_by_user_id": case.submitted_by_user_id,
        "history_summary": case.history_summary,
        "discussion_status": case.discussion_status,
        "final_recommendation": case.final_recommendation,
        "created_at": case.created_at,
        "updated_at": case.updated_at,
        "submitted_by_name": case.submitted_by.name if case.submitted_by else None,
        "patient_name": case.patient.full_name if case.patient else None,
        "comment_count": len(case.comments),
    }
    return data


def _enrich_comment(comment: MDTComment) -> dict:
    return {
        "id": comment.id,
        "case_id": comment.case_id,
        "user_id": comment.user_id,
        "comment_text": comment.comment_text,
        "created_at": comment.created_at,
        "author_name": comment.author.name if comment.author else None,
        "author_role": comment.author.role.value if comment.author else None,
    }


def _load_case(case_id: int, db: Session) -> MDTCase:
    case = (
        db.query(MDTCase)
        .options(
            joinedload(MDTCase.patient),
            joinedload(MDTCase.submitted_by),
            joinedload(MDTCase.comments).joinedload(MDTComment.author),
        )
        .filter(MDTCase.id == case_id)
        .first()
    )
    if not case:
        raise HTTPException(status_code=404, detail="MDT case not found")
    return case


@router.get("/", response_model=List[MDTCaseOut])
def list_mdt_cases(
    status_filter: Optional[MDTStatus] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("mdt:read")),
):
    q = db.query(MDTCase).options(
        joinedload(MDTCase.patient),
        joinedload(MDTCase.submitted_by),
        joinedload(MDTCase.comments),
    )
    if status_filter:
        q = q.filter(MDTCase.discussion_status == status_filter)
    cases = q.order_by(MDTCase.created_at.desc()).offset(skip).limit(limit).all()
    return [MDTCaseOut(**_enrich_case(c)) for c in cases]


@router.post("/", response_model=MDTCaseOut, status_code=status.HTTP_201_CREATED)
def create_mdt_case(
    payload: MDTCaseCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("mdt:write")),
):
    case = MDTCase(
        patient_id=payload.patient_id,
        submitted_by_user_id=current_user.id,
        history_summary=payload.history_summary,
        discussion_status=MDTStatus.OPEN,
    )
    db.add(case)
    db.commit()
    case = _load_case(case.id, db)
    log_audit(
        db,
        user_id=current_user.id,
        action="CREATE",
        resource_type="mdt_case",
        resource_id=case.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"patient_id": payload.patient_id},
    )

    # Notify all doctors / specialists about the new MDT case
    from app.models.user import UserRole
    from app.services.notifications import send_mdt_alert
    panel_user_ids = [
        u.id for u in db.query(User).filter(
            User.role.in_([
                UserRole.DOCTOR,
                UserRole.GASTROENTEROLOGIST,
                UserRole.HEPATOLOGIST,
            ]),
            User.is_active == True,
            User.deleted_at.is_(None),
        ).all()
    ]
    if panel_user_ids:
        send_mdt_alert.delay(case.id, panel_user_ids)

    return MDTCaseOut(**_enrich_case(case))


@router.get("/{case_id}", response_model=MDTCaseDetail)
def get_mdt_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("mdt:read")),
):
    case = _load_case(case_id, db)
    detail = {**_enrich_case(case), "comments": [MDTCommentOut(**_enrich_comment(c)) for c in case.comments]}
    return MDTCaseDetail(**detail)


@router.post("/{case_id}/comments", response_model=MDTCommentOut, status_code=status.HTTP_201_CREATED)
def add_comment(
    case_id: int,
    payload: MDTCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("mdt:write")),
):
    case = db.query(MDTCase).filter(MDTCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="MDT case not found")
    if case.discussion_status == MDTStatus.CONCLUDED:
        raise HTTPException(status_code=400, detail="Cannot comment on a concluded case")

    comment = MDTComment(case_id=case_id, user_id=current_user.id, comment_text=payload.comment_text)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    # eager-load author for response
    from sqlalchemy.orm import joinedload as jl
    comment = db.query(MDTComment).options(jl(MDTComment.author)).filter(MDTComment.id == comment.id).first()
    return MDTCommentOut(**_enrich_comment(comment))


@router.put("/{case_id}/conclude", response_model=MDTCaseDetail)
def conclude_mdt_case(
    case_id: int,
    payload: MDTCaseConclude,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("mdt:conclude")),
):
    case = db.query(MDTCase).filter(MDTCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="MDT case not found")
    if case.discussion_status == MDTStatus.CONCLUDED:
        raise HTTPException(status_code=400, detail="Case is already concluded")

    case.discussion_status = MDTStatus.CONCLUDED
    case.final_recommendation = payload.final_recommendation
    db.commit()

    log_audit(
        db,
        user_id=current_user.id,
        action="CONCLUDE",
        resource_type="mdt_case",
        resource_id=case_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"final_recommendation": payload.final_recommendation},
    )

    case = _load_case(case_id, db)
    detail = {**_enrich_case(case), "comments": [MDTCommentOut(**_enrich_comment(c)) for c in case.comments]}
    return MDTCaseDetail(**detail)
