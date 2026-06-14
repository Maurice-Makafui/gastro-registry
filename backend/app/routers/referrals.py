from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.models.referral import Referral, ReferralStatus, RiskLevel, FeedbackStatus
from app.models.user import User, UserRole
from app.core.security import get_current_user
from app.core.triage import calculate_risk_level, get_triage_recommendations
from app.schemas import ReferralCreate, ReferralOut, ReferralUpdate
from app.services import referral_feedback_service

router = APIRouter(prefix="/referrals", tags=["Referrals"])


def _load_referral(referral_id: int, db: Session) -> Referral:
    referral = (
        db.query(Referral)
        .options(
            joinedload(Referral.patient),
            joinedload(Referral.assigned_doctor),
            joinedload(Referral.created_by_user),
            joinedload(Referral.referring_physician),
        )
        .filter(Referral.id == referral_id)
        .first()
    )
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")
    return referral


@router.post("/create", response_model=ReferralOut, status_code=201)
def create_referral(
    payload: ReferralCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vitals_dict = payload.vitals.model_dump() if payload.vitals else None
    risk_level = calculate_risk_level(payload.symptoms, vitals_dict)
    recommendations = get_triage_recommendations(risk_level, payload.symptoms)

    referring_physician_id = payload.referring_physician_id
    if current_user.role == UserRole.REFERRING_PHYSICIAN and not referring_physician_id:
        referring_physician_id = current_user.id

    referral = Referral(
        patient_id=payload.patient_id,
        created_by=current_user.id,
        referring_physician_id=referring_physician_id,
        source_facility=payload.source_facility,
        facility_id=payload.facility_id,
        symptoms=payload.symptoms,
        vitals=vitals_dict,
        chief_complaint=payload.chief_complaint,
        clinical_notes=payload.clinical_notes,
        risk_level=RiskLevel(risk_level),
        urgency=recommendations["urgency"],
        status=ReferralStatus.PENDING,
        feedback_status=FeedbackStatus.PENDING,
    )
    db.add(referral)
    db.flush()

    referral_feedback_service.create_initial_feedback_timeline(db, referral, current_user)

    db.commit()

    if referral.assigned_doctor_id:
        from app.services.notifications import send_referral_notification
        send_referral_notification.delay(referral.id, referral.assigned_doctor_id)

    return _load_referral(referral.id, db)


@router.get("/list", response_model=List[ReferralOut])
def list_referrals(
    status: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    feedback_status: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Referral).options(
        joinedload(Referral.patient),
        joinedload(Referral.assigned_doctor),
        joinedload(Referral.referring_physician),
    )
    if status:
        query = query.filter(Referral.status == status.upper())
    if risk_level:
        query = query.filter(Referral.risk_level == risk_level.upper())
    if feedback_status:
        query = query.filter(Referral.feedback_status == feedback_status.upper())

    return query.order_by(Referral.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{referral_id}", response_model=ReferralOut)
def get_referral(
    referral_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _load_referral(referral_id, db)


@router.put("/{referral_id}", response_model=ReferralOut)
def update_referral(
    referral_id: int,
    payload: ReferralUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    referral = db.query(Referral).filter(Referral.id == referral_id).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    update_data = payload.model_dump(exclude_unset=True, exclude_none=True)
    previous_status = referral.status.value if referral.status else None

    for key, value in update_data.items():
        setattr(referral, key, value)

    if "status" in update_data and update_data["status"] != previous_status:
        from app.models.referral_timeline import TimelineStatusType
        referral_feedback_service.add_timeline_entry(
            db,
            referral=referral,
            actor=current_user,
            from_status=previous_status,
            to_status=update_data["status"].value if hasattr(update_data["status"], "value") else str(update_data["status"]),
            status_type=TimelineStatusType.WORKFLOW,
            note="Referral workflow status updated",
        )

    db.commit()
    return _load_referral(referral_id, db)
