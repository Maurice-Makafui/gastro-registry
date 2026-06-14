from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date, timedelta
from app.database import get_db
from app.models.followup import FollowUp
from app.models.user import User
from app.core.security import get_current_user
from app.schemas import FollowUpCreate, FollowUpOut, FollowUpUpdate

router = APIRouter(prefix="/followups", tags=["Follow-ups"])


@router.post("/create", response_model=FollowUpOut, status_code=201)
def create_followup(
    payload: FollowUpCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    followup = FollowUp(
        patient_id=payload.patient_id,
        referral_id=payload.referral_id,
        scheduled_by=current_user.id,
        next_visit_date=payload.next_visit_date,
        reason=payload.reason,
        notes=payload.notes,
    )
    db.add(followup)
    db.commit()
    db.refresh(followup)
    return (
        db.query(FollowUp)
        .options(joinedload(FollowUp.patient))
        .filter(FollowUp.id == followup.id)
        .first()
    )


@router.get("/", response_model=List[FollowUpOut])
def list_followups(
    patient_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    upcoming_days: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(FollowUp).options(joinedload(FollowUp.patient))
    if patient_id:
        query = query.filter(FollowUp.patient_id == patient_id)
    if status:
        query = query.filter(FollowUp.status == status.upper())
    if upcoming_days:
        future = date.today() + timedelta(days=upcoming_days)
        query = query.filter(
            FollowUp.next_visit_date >= date.today(),
            FollowUp.next_visit_date <= future,
        )
    return query.order_by(FollowUp.next_visit_date.asc()).all()


@router.put("/{followup_id}", response_model=FollowUpOut)
def update_followup(
    followup_id: int,
    payload: FollowUpUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    followup = db.query(FollowUp).filter(FollowUp.id == followup_id).first()
    if not followup:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    for key, value in payload.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(followup, key, value)

    db.commit()
    db.refresh(followup)
    return followup
