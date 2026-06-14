from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from app.models.referral import Referral, FeedbackStatus
from app.models.referral_timeline import ReferralTimeline, TimelineStatusType
from app.models.user import User, UserRole
from app.core.permissions import SPECIALIST_ROLES
from app.core.rbac import is_specialist
from app.schemas.referral_feedback import (
    ReferralFeedbackAccept,
    ReferralFeedbackReject,
    ReferralFeedbackComplete,
)


def _get_referral(db: Session, referral_id: int) -> Referral:
    referral = (
        db.query(Referral)
        .options(
            joinedload(Referral.referring_physician),
            joinedload(Referral.timeline_entries).joinedload(ReferralTimeline.actor),
        )
        .filter(Referral.id == referral_id)
        .first()
    )
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")
    return referral


def _can_view_feedback(user: User, referral: Referral) -> bool:
    if user.role == UserRole.ADMIN:
        return True
    if user.role == UserRole.NURSE:
        return True
    if is_specialist(user):
        return True
    if user.role == UserRole.REFERRING_PHYSICIAN:
        return referral.referring_physician_id == user.id or referral.created_by == user.id
    return False


def _can_manage_feedback(user: User, referral: Referral) -> bool:
    if user.role == UserRole.ADMIN:
        return True
    if is_specialist(user):
        return referral.feedback_status in (FeedbackStatus.PENDING, FeedbackStatus.ACCEPTED)
    return False


def add_timeline_entry(
    db: Session,
    *,
    referral: Referral,
    actor: User,
    from_status: Optional[str],
    to_status: str,
    status_type: TimelineStatusType,
    note: Optional[str] = None,
) -> ReferralTimeline:
    entry = ReferralTimeline(
        referral_id=referral.id,
        actor_id=actor.id,
        from_status=from_status,
        to_status=to_status,
        status_type=status_type,
        note=note,
    )
    db.add(entry)
    return entry


def create_initial_feedback_timeline(db: Session, referral: Referral, actor: User) -> None:
    add_timeline_entry(
        db,
        referral=referral,
        actor=actor,
        from_status=None,
        to_status=FeedbackStatus.PENDING.value,
        status_type=TimelineStatusType.FEEDBACK,
        note="Referral submitted for specialist review",
    )


def get_timeline(db: Session, referral_id: int, user: User) -> list[ReferralTimeline]:
    referral = _get_referral(db, referral_id)
    if not _can_view_feedback(user, referral):
        raise HTTPException(status_code=403, detail="Access denied to referral timeline")
    return (
        db.query(ReferralTimeline)
        .options(joinedload(ReferralTimeline.actor))
        .filter(ReferralTimeline.referral_id == referral_id)
        .order_by(ReferralTimeline.created_at.desc())
        .all()
    )


def get_feedback_detail(db: Session, referral_id: int, user: User) -> Referral:
    referral = _get_referral(db, referral_id)
    if not _can_view_feedback(user, referral):
        raise HTTPException(status_code=403, detail="Access denied to referral feedback")
    return referral


def accept_referral(
    db: Session,
    referral_id: int,
    user: User,
    payload: ReferralFeedbackAccept,
) -> Referral:
    referral = _get_referral(db, referral_id)
    if not _can_manage_feedback(user, referral):
        raise HTTPException(status_code=403, detail="Cannot accept this referral")

    if referral.feedback_status != FeedbackStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Referral feedback status is {referral.feedback_status.value}, expected PENDING",
        )

    previous = referral.feedback_status.value
    referral.feedback_status = FeedbackStatus.ACCEPTED
    referral.accepted_at = datetime.now(timezone.utc)
    referral.assigned_doctor_id = user.id

    add_timeline_entry(
        db,
        referral=referral,
        actor=user,
        from_status=previous,
        to_status=FeedbackStatus.ACCEPTED.value,
        status_type=TimelineStatusType.FEEDBACK,
        note=payload.note or "Referral accepted by specialist",
    )

    db.commit()
    return _get_referral(db, referral_id)


def reject_referral(
    db: Session,
    referral_id: int,
    user: User,
    payload: ReferralFeedbackReject,
) -> Referral:
    referral = _get_referral(db, referral_id)
    if not _can_manage_feedback(user, referral):
        raise HTTPException(status_code=403, detail="Cannot reject this referral")

    if referral.feedback_status != FeedbackStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Referral feedback status is {referral.feedback_status.value}, expected PENDING",
        )

    previous = referral.feedback_status.value
    referral.feedback_status = FeedbackStatus.REJECTED

    add_timeline_entry(
        db,
        referral=referral,
        actor=user,
        from_status=previous,
        to_status=FeedbackStatus.REJECTED.value,
        status_type=TimelineStatusType.FEEDBACK,
        note=payload.note,
    )

    db.commit()
    return _get_referral(db, referral_id)


def complete_referral(
    db: Session,
    referral_id: int,
    user: User,
    payload: ReferralFeedbackComplete,
) -> Referral:
    referral = _get_referral(db, referral_id)
    if not _can_manage_feedback(user, referral):
        raise HTTPException(status_code=403, detail="Cannot complete this referral")

    if referral.feedback_status != FeedbackStatus.ACCEPTED:
        raise HTTPException(
            status_code=400,
            detail=f"Referral must be ACCEPTED before completion, currently {referral.feedback_status.value}",
        )

    previous = referral.feedback_status.value
    referral.feedback_status = FeedbackStatus.COMPLETED
    referral.completed_at = datetime.now(timezone.utc)
    referral.outcome_summary = payload.outcome_summary
    referral.recommendation_text = payload.recommendation_text

    add_timeline_entry(
        db,
        referral=referral,
        actor=user,
        from_status=previous,
        to_status=FeedbackStatus.COMPLETED.value,
        status_type=TimelineStatusType.FEEDBACK,
        note="Final recommendation issued to referring physician",
    )

    db.commit()
    return _get_referral(db, referral_id)
