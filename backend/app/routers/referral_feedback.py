from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.core.security import get_current_user
from app.core.audit import log_audit
from app.schemas.referral_feedback import (
    ReferralTimelineOut,
    ReferralFeedbackOut,
    ReferralFeedbackAccept,
    ReferralFeedbackReject,
    ReferralFeedbackComplete,
)
from app.services import referral_feedback_service

router = APIRouter(prefix="/referrals", tags=["Referral Feedback"])


@router.get("/{referral_id}/timeline", response_model=List[ReferralTimelineOut])
def get_referral_timeline(
    referral_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return referral_feedback_service.get_timeline(db, referral_id, current_user)


@router.get("/{referral_id}/feedback", response_model=ReferralFeedbackOut)
def get_referral_feedback(
    referral_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    referral = referral_feedback_service.get_feedback_detail(db, referral_id, current_user)
    timeline = referral_feedback_service.get_timeline(db, referral_id, current_user)
    return ReferralFeedbackOut(
        referral_id=referral.id,
        feedback_status=referral.feedback_status,
        accepted_at=referral.accepted_at,
        completed_at=referral.completed_at,
        outcome_summary=referral.outcome_summary,
        recommendation_text=referral.recommendation_text,
        referring_physician_id=referral.referring_physician_id,
        timeline=timeline,
    )


@router.post("/{referral_id}/feedback/accept", response_model=ReferralFeedbackOut)
def accept_referral_feedback(
    referral_id: int,
    payload: ReferralFeedbackAccept,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    referral = referral_feedback_service.accept_referral(db, referral_id, current_user, payload)
    log_audit(
        db,
        user_id=current_user.id,
        action="ACCEPT",
        resource_type="referral_feedback",
        resource_id=referral_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    timeline = referral_feedback_service.get_timeline(db, referral_id, current_user)
    return ReferralFeedbackOut(
        referral_id=referral.id,
        feedback_status=referral.feedback_status,
        accepted_at=referral.accepted_at,
        completed_at=referral.completed_at,
        outcome_summary=referral.outcome_summary,
        recommendation_text=referral.recommendation_text,
        referring_physician_id=referral.referring_physician_id,
        timeline=timeline,
    )


@router.post("/{referral_id}/feedback/reject", response_model=ReferralFeedbackOut)
def reject_referral_feedback(
    referral_id: int,
    payload: ReferralFeedbackReject,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    referral = referral_feedback_service.reject_referral(db, referral_id, current_user, payload)
    log_audit(
        db,
        user_id=current_user.id,
        action="REJECT",
        resource_type="referral_feedback",
        resource_id=referral_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"note": payload.note},
    )
    timeline = referral_feedback_service.get_timeline(db, referral_id, current_user)
    return ReferralFeedbackOut(
        referral_id=referral.id,
        feedback_status=referral.feedback_status,
        accepted_at=referral.accepted_at,
        completed_at=referral.completed_at,
        outcome_summary=referral.outcome_summary,
        recommendation_text=referral.recommendation_text,
        referring_physician_id=referral.referring_physician_id,
        timeline=timeline,
    )


@router.post("/{referral_id}/feedback/complete", response_model=ReferralFeedbackOut)
def complete_referral_feedback(
    referral_id: int,
    payload: ReferralFeedbackComplete,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    referral = referral_feedback_service.complete_referral(db, referral_id, current_user, payload)
    log_audit(
        db,
        user_id=current_user.id,
        action="COMPLETE",
        resource_type="referral_feedback",
        resource_id=referral_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    timeline = referral_feedback_service.get_timeline(db, referral_id, current_user)
    return ReferralFeedbackOut(
        referral_id=referral.id,
        feedback_status=referral.feedback_status,
        accepted_at=referral.accepted_at,
        completed_at=referral.completed_at,
        outcome_summary=referral.outcome_summary,
        recommendation_text=referral.recommendation_text,
        referring_physician_id=referral.referring_physician_id,
        timeline=timeline,
    )
