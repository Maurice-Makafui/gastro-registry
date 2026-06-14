from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database import get_db
from app.models.referral import Referral, ReferralStatus
from app.models.consultation import Consultation
from app.models.user import User
from app.core.rbac import is_specialist
from app.core.security import get_current_user, require_role
from app.schemas import ConsultationCreate, ConsultationOut, ReferralOut

router = APIRouter(prefix="/doctor", tags=["Doctor"])


@router.get("/referrals", response_model=List[ReferralOut])
def get_doctor_referrals(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DOCTOR", "ADMIN")),
):
    """Get all referrals assigned to this doctor, or all if ADMIN."""
    query = db.query(Referral).options(
        joinedload(Referral.patient),
        joinedload(Referral.assigned_doctor),
    )
    if is_specialist(current_user):
        query = query.filter(
            (Referral.assigned_doctor_id == current_user.id) |
            (Referral.assigned_doctor_id.is_(None))
        )
    return query.order_by(Referral.created_at.desc()).all()


@router.post("/update-case", response_model=ConsultationOut, status_code=201)
def update_case(
    payload: ConsultationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DOCTOR", "ADMIN")),
):
    referral = db.query(Referral).filter(Referral.id == payload.referral_id).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    consultation = Consultation(
        referral_id=payload.referral_id,
        doctor_id=current_user.id,
        diagnosis=payload.diagnosis,
        icd_code=payload.icd_code,
        notes=payload.notes,
        treatment_plan=payload.treatment_plan,
        investigations_ordered=payload.investigations_ordered,
        outcome=payload.outcome,
    )
    db.add(consultation)

    # Update referral status
    referral.status = ReferralStatus.COMPLETED if payload.outcome else ReferralStatus.UNDER_REVIEW
    referral.assigned_doctor_id = current_user.id

    db.commit()
    db.refresh(consultation)

    return (
        db.query(Consultation)
        .options(joinedload(Consultation.doctor))
        .filter(Consultation.id == consultation.id)
        .first()
    )


@router.get("/consultations/{referral_id}", response_model=List[ConsultationOut])
def get_consultations(
    referral_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DOCTOR", "ADMIN")),
):
    return (
        db.query(Consultation)
        .options(joinedload(Consultation.doctor))
        .filter(Consultation.referral_id == referral_id)
        .order_by(Consultation.created_at.desc())
        .all()
    )
