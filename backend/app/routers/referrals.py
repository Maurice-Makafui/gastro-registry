from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.models.referral import Referral, ReferralStatus, RiskLevel, FeedbackStatus
from app.models.user import User, UserRole
from app.models.specialist import Specialist
from app.models.facility import Facility
from app.models.network_registry import (
    NetworkRegistry,
    NetworkEntityType,
    VerificationStatus,
    RegistryStatus,
    MembershipStatus,
    ApprovalStatus,
)

from app.core.security import get_current_user
from app.core.rbac import require_permission
from app.core.triage import calculate_risk_level, get_triage_recommendations
from app.core.audit import log_audit
from app.core.rbac import is_specialist
from app.schemas import ReferralCreate, ReferralOut, ReferralRoute, ReferralUpdate, ReferralAccept, ReferralDecline, ReferralReferOn
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
            joinedload(Referral.receiving_specialist).joinedload(Specialist.user),
            joinedload(Referral.receiving_specialist).joinedload(Specialist.institution),
            joinedload(Referral.receiving_facility),
        )
        .filter(Referral.id == referral_id)
        .first()
    )
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")
    return referral


def _network_registry_eligible(

    db: Session,
    *,
    receiving_specialist_id: Optional[int],
    receiving_facility_id: Optional[int],
) -> tuple[Optional[Specialist], Optional[Facility]]:
    """Enforce GASLID provider registry eligibility for referral destinations."""

    specialist: Optional[Specialist] = None
    facility: Optional[Facility] = None

    today = __import__("datetime").date.today()

    def _eligible_network_row_for_specialist(sid: int) -> bool:
        return (
            db.query(NetworkRegistry)
            .filter(
                NetworkRegistry.entity_type == NetworkEntityType.SPECIALIST,
                NetworkRegistry.specialist_id == sid,
                NetworkRegistry.verification_status == VerificationStatus.VERIFIED,
                NetworkRegistry.registry_status == RegistryStatus.ACTIVE,
                NetworkRegistry.membership_status == MembershipStatus.ACTIVE,
                NetworkRegistry.approval_status == ApprovalStatus.APPROVED_BY_GASLID,
                NetworkRegistry.expiry_date.isnot(None),
                NetworkRegistry.expiry_date >= today,
            )
            .first()
            is not None
        )

    def _eligible_network_row_for_facility(fid: int) -> bool:
        return (
            db.query(NetworkRegistry)
            .filter(
                NetworkRegistry.entity_type == NetworkEntityType.FACILITY,
                NetworkRegistry.facility_id == fid,
                NetworkRegistry.verification_status == VerificationStatus.VERIFIED,
                NetworkRegistry.registry_status == RegistryStatus.ACTIVE,
                NetworkRegistry.membership_status == MembershipStatus.ACTIVE,
                NetworkRegistry.approval_status == ApprovalStatus.APPROVED_BY_GASLID,
                NetworkRegistry.expiry_date.isnot(None),
                NetworkRegistry.expiry_date >= today,
            )
            .first()
            is not None
        )

    if receiving_specialist_id:
        if not _eligible_network_row_for_specialist(receiving_specialist_id):
            raise HTTPException(status_code=400, detail="Receiving specialist not eligible in GASLID network registry")

        specialist = (
            db.query(Specialist)
            .filter(
                Specialist.id == receiving_specialist_id,
                Specialist.deleted_at.is_(None),
            )
            .first()
        )
        if not specialist:
            raise HTTPException(status_code=400, detail="Receiving specialist not found")
        facility = facility or specialist.institution

    if receiving_facility_id:
        if not _eligible_network_row_for_facility(receiving_facility_id):
            raise HTTPException(status_code=400, detail="Receiving facility not eligible in GASLID network registry")

        facility = (
            db.query(Facility)
            .filter(
                Facility.id == receiving_facility_id,
                Facility.deleted_at.is_(None),
            )
            .first()
        )
        if not facility:
            raise HTTPException(status_code=400, detail="Receiving facility not found")

    return specialist, facility



@router.post("/create", response_model=ReferralOut, status_code=201)
def create_referral(
    payload: ReferralCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("referrals:write")),
):
    vitals_dict = payload.vitals.model_dump() if payload.vitals else None
    risk_level = calculate_risk_level(payload.symptoms, vitals_dict)
    recommendations = get_triage_recommendations(risk_level, payload.symptoms)

    if not payload.receiving_specialist_id and not (payload.receiving_facility_id or payload.facility_id):
        raise HTTPException(status_code=400, detail="Receiving specialist or facility is required")

    referring_physician_id = payload.referring_physician_id
    if current_user.role == UserRole.REFERRING_PHYSICIAN and not referring_physician_id:
        referring_physician_id = current_user.id

    # Resolve receiving specialist → auto-derive their facility
    receiving_specialist_id = payload.receiving_specialist_id
    receiving_facility_id = payload.receiving_facility_id or payload.facility_id

    specialist, facility = _network_registry_eligible(
        db,
        receiving_specialist_id=receiving_specialist_id,
        receiving_facility_id=receiving_facility_id,
    )


    if specialist and not receiving_facility_id:
        receiving_facility_id = specialist.institution_id

    referral = Referral(
        patient_id=payload.patient_id,
        created_by=current_user.id,
        referring_physician_id=referring_physician_id,
        source_facility=payload.source_facility,
        facility_id=payload.facility_id,
        receiving_specialist_id=receiving_specialist_id,
        receiving_facility_id=receiving_facility_id,
        symptoms=payload.symptoms,
        vitals=vitals_dict,
        chief_complaint=payload.chief_complaint,
        clinical_notes=payload.clinical_notes,
        referral_reason=payload.referral_reason,
        risk_level=RiskLevel(risk_level),
        urgency=recommendations["urgency"],
        status=ReferralStatus.PENDING,
        feedback_status=FeedbackStatus.PENDING,
    )
    db.add(referral)
    db.flush()

    referral_feedback_service.create_initial_feedback_timeline(db, referral, current_user)

    # Extra timeline entry when routed to a specialist
    if receiving_specialist_id:
        from app.models.referral_timeline import TimelineStatusType
        referral_feedback_service.add_timeline_entry(
            db,
            referral=referral,
            actor=current_user,
            from_status=None,
            to_status="sent_to_specialist",
            status_type=TimelineStatusType.WORKFLOW,
            note=f"Referred directly to specialist ID {receiving_specialist_id}",
        )

    db.commit()

    log_audit(
        db,
        user_id=current_user.id,
        action="referral_created",
        resource_type="referral",
        resource_id=referral.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={
            "receiving_specialist_id": receiving_specialist_id,
            "receiving_facility_id": receiving_facility_id,
            "risk_level": risk_level,
            "referral_reason": payload.referral_reason,
        },
    )

    if receiving_specialist_id:
        try:
            from app.services.notifications import send_specialist_referral_notification
            send_specialist_referral_notification.delay(referral.id, receiving_specialist_id)
        except Exception:
            pass
    if receiving_facility_id:
        try:
            from app.services.notifications import send_facility_referral_notification
            send_facility_referral_notification.delay(referral.id, receiving_facility_id)
        except Exception:
            pass
    if not receiving_specialist_id and referral.assigned_doctor_id:
        from app.services.notifications import send_referral_notification
        send_referral_notification.delay(referral.id, referral.assigned_doctor_id)

    return _load_referral(referral.id, db)


@router.get("/incoming", response_model=List[ReferralOut])
def list_incoming_referrals(
    status: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("referrals:read")),
):
    """Returns referrals sent directly to the authenticated specialist."""
    if not is_specialist(current_user) and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only specialists can view incoming referrals")

    from app.models.specialist import Specialist as SpecialistModel
    specialist = db.query(SpecialistModel).filter(SpecialistModel.user_id == current_user.id).first()
    if not specialist:
        return []

    query = (
        db.query(Referral)
        .options(
            joinedload(Referral.patient),
            joinedload(Referral.assigned_doctor),
            joinedload(Referral.referring_physician),
            joinedload(Referral.receiving_specialist),
            joinedload(Referral.receiving_facility),
        )
        .filter(Referral.receiving_specialist_id == specialist.id)
    )
    if status:
        query = query.filter(Referral.status == status.upper())

    return query.order_by(Referral.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/incoming/facility", response_model=List[ReferralOut])
def list_incoming_facility_referrals(
    status: Optional[str] = Query(None),
    facility_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("referrals:read")),
):
    """Returns referrals sent to the current user's facility (or specified facility for admins)."""
    resolved_facility_id = facility_id or current_user.facility_id
    if current_user.role != UserRole.ADMIN and current_user.role != UserRole.SUPER_ADMIN:
        if not resolved_facility_id:
            raise HTTPException(status_code=403, detail="No facility context for user")
    if not resolved_facility_id:
        raise HTTPException(status_code=400, detail="Facility ID required")

    query = (
        db.query(Referral)
        .options(
            joinedload(Referral.patient),
            joinedload(Referral.assigned_doctor),
            joinedload(Referral.referring_physician),
            joinedload(Referral.receiving_specialist),
            joinedload(Referral.receiving_facility),
        )
        .filter(Referral.receiving_facility_id == resolved_facility_id)
    )
    if status:
        query = query.filter(Referral.status == status.upper())

    return query.order_by(Referral.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/list", response_model=List[ReferralOut])
def list_referrals(
    status: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    feedback_status: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("referrals:read")),
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
    current_user: User = Depends(require_permission("referrals:read")),
):
    return _load_referral(referral_id, db)


@router.put("/{referral_id}", response_model=ReferralOut)
def update_referral(
    referral_id: int,
    payload: ReferralUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("referrals:write")),
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


@router.post("/{referral_id}/refer", response_model=ReferralOut)
def refer_out_referral(
    referral_id: int,
    payload: ReferralRoute,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("referrals:write")),
):
    """Re-route an existing referral to another specialist or facility."""
    referral = db.query(Referral).filter(Referral.id == referral_id).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    if not payload.receiving_specialist_id and not payload.receiving_facility_id:
        raise HTTPException(status_code=400, detail="Receiving specialist or facility is required")

    specialist, facility = _network_registry_eligible(
        db,
        receiving_specialist_id=payload.receiving_specialist_id,
        receiving_facility_id=payload.receiving_facility_id,
    )


    receiving_facility_id = payload.receiving_facility_id or (specialist.institution_id if specialist else None)

    previous_status = referral.status.value if referral.status else None
    referral.receiving_specialist_id = payload.receiving_specialist_id
    referral.receiving_facility_id = receiving_facility_id
    referral.referral_reason = payload.referral_reason or referral.referral_reason
    referral.status = ReferralStatus.REFERRED_OUT
    referral.feedback_status = FeedbackStatus.PENDING

    from app.models.referral_timeline import TimelineStatusType
    referral_feedback_service.add_timeline_entry(
        db,
        referral=referral,
        actor=current_user,
        from_status=previous_status,
        to_status=ReferralStatus.REFERRED_OUT.value,
        status_type=TimelineStatusType.WORKFLOW,
        note=payload.referral_reason or "Referral routed to another provider",
    )

    db.commit()

    log_audit(
        db,
        user_id=current_user.id,
        action="referral_rerouted",
        resource_type="referral",
        resource_id=referral.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={
            "receiving_specialist_id": payload.receiving_specialist_id,
            "receiving_facility_id": receiving_facility_id,
            "reason": payload.referral_reason,
        },
    )

    if payload.receiving_specialist_id:
        try:
            from app.services.notifications import send_specialist_referral_notification

            send_specialist_referral_notification.delay(referral.id, payload.receiving_specialist_id)
        except Exception:
            pass
    if receiving_facility_id:
        try:
            from app.services.notifications import send_facility_referral_notification

            send_facility_referral_notification.delay(referral.id, receiving_facility_id)
        except Exception:
            pass

    return _load_referral(referral_id, db)


@router.post("/{referral_id}/accept", response_model=ReferralOut)
def accept_referral(
    referral_id: int,
    payload: ReferralAccept,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("referrals:write")),
):
    """Assigned specialist/doctor accepts a referral directed to them."""
    referral = db.query(Referral).filter(Referral.id == referral_id).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    # Validate the current user is actually the intended recipient
    specialist = db.query(Specialist).filter(Specialist.user_id == current_user.id).first()
    is_assigned_specialist = specialist and referral.receiving_specialist_id == specialist.id
    is_assigned_doctor = referral.assigned_doctor_id == current_user.id
    is_admin = current_user.role in {UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN}

    if not (is_assigned_specialist or is_assigned_doctor or is_admin):
        raise HTTPException(status_code=403, detail="Only the assigned recipient can accept this referral")

    if referral.status in {ReferralStatus.ACCEPTED, ReferralStatus.COMPLETED, ReferralStatus.CANCELLED}:
        raise HTTPException(status_code=400, detail=f"Cannot accept referral with status {referral.status.value}")

    from datetime import datetime, timezone
    from app.models.referral_timeline import TimelineStatusType

    previous_status = referral.status.value
    referral.status = ReferralStatus.ACCEPTED
    referral.feedback_status = FeedbackStatus.ACCEPTED
    referral.accepted_at = datetime.now(timezone.utc)
    if specialist:
        referral.assigned_doctor_id = current_user.id

    referral_feedback_service.add_timeline_entry(
        db, referral=referral, actor=current_user,
        from_status=previous_status, to_status=ReferralStatus.ACCEPTED.value,
        status_type=TimelineStatusType.WORKFLOW,
        note=payload.note or "Referral accepted",
    )
    db.commit()

    log_audit(
        db, user_id=current_user.id, action="referral_accepted",
        resource_type="referral", resource_id=referral.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return _load_referral(referral_id, db)


@router.post("/{referral_id}/decline", response_model=ReferralOut)
def decline_referral(
    referral_id: int,
    payload: ReferralDecline,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("referrals:write")),
):
    """Assigned specialist/doctor declines a referral with a mandatory reason."""
    referral = db.query(Referral).filter(Referral.id == referral_id).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    specialist = db.query(Specialist).filter(Specialist.user_id == current_user.id).first()
    is_assigned_specialist = specialist and referral.receiving_specialist_id == specialist.id
    is_assigned_doctor = referral.assigned_doctor_id == current_user.id
    is_admin = current_user.role in {UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN}

    if not (is_assigned_specialist or is_assigned_doctor or is_admin):
        raise HTTPException(status_code=403, detail="Only the assigned recipient can decline this referral")

    if referral.status in {ReferralStatus.DECLINED, ReferralStatus.COMPLETED, ReferralStatus.CANCELLED}:
        raise HTTPException(status_code=400, detail=f"Cannot decline referral with status {referral.status.value}")

    from datetime import datetime, timezone
    from app.models.referral_timeline import TimelineStatusType

    previous_status = referral.status.value
    referral.status = ReferralStatus.DECLINED
    referral.feedback_status = FeedbackStatus.REJECTED
    referral.decline_reason = payload.decline_reason
    referral.declined_at = datetime.now(timezone.utc)

    referral_feedback_service.add_timeline_entry(
        db, referral=referral, actor=current_user,
        from_status=previous_status, to_status=ReferralStatus.DECLINED.value,
        status_type=TimelineStatusType.WORKFLOW,
        note=payload.decline_reason,
    )
    db.commit()

    log_audit(
        db, user_id=current_user.id, action="referral_declined",
        resource_type="referral", resource_id=referral.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"decline_reason": payload.decline_reason},
    )
    return _load_referral(referral_id, db)


@router.post("/{referral_id}/refer-on", response_model=ReferralOut)
def refer_on_referral(
    referral_id: int,
    payload: ReferralReferOn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("referrals:write")),
):
    """Accepted recipient refers the patient onward to another registry provider."""
    if not (
        is_specialist(current_user)
        or current_user.role in {UserRole.REFERRING_PHYSICIAN, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN}
    ):
        raise HTTPException(status_code=403, detail="Only authorised clinicians can refer onward")

    referral = db.query(Referral).filter(Referral.id == referral_id).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    if not payload.receiving_specialist_id and not payload.receiving_facility_id:
        raise HTTPException(status_code=400, detail="Target specialist or facility is required")

    # Prevent self-referral
    specialist = db.query(Specialist).filter(Specialist.user_id == current_user.id).first()
    if specialist and payload.receiving_specialist_id == specialist.id:
        raise HTTPException(status_code=400, detail="Cannot refer onward to yourself")

    new_spec, new_fac = _network_registry_eligible(
        db,
        receiving_specialist_id=payload.receiving_specialist_id,
        receiving_facility_id=payload.receiving_facility_id,
    )

    new_facility_id = payload.receiving_facility_id or (new_spec.institution_id if new_spec else None)

    from app.models.referral_timeline import TimelineStatusType

    previous_status = referral.status.value
    # Store which referral this was chained from (keep the original id before mutation)
    referral.referred_on_from_referral_id = referral.id if referral.referred_on_from_referral_id is None else referral.referred_on_from_referral_id
    referral.receiving_specialist_id = payload.receiving_specialist_id
    referral.receiving_facility_id = new_facility_id
    referral.referral_reason = payload.referral_reason or referral.referral_reason
    referral.status = ReferralStatus.REFERRED_ON
    referral.feedback_status = FeedbackStatus.PENDING
    referral.assigned_doctor_id = None

    referral_feedback_service.add_timeline_entry(
        db, referral=referral, actor=current_user,
        from_status=previous_status, to_status=ReferralStatus.REFERRED_ON.value,
        status_type=TimelineStatusType.WORKFLOW,
        note=payload.referral_reason or "Referred onward to another provider",
    )
    db.commit()

    log_audit(
        db, user_id=current_user.id, action="referral_referred_on",
        resource_type="referral", resource_id=referral.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={
            "to_specialist_id": payload.receiving_specialist_id,
            "to_facility_id": new_facility_id,
            "reason": payload.referral_reason,
        },
    )

    if payload.receiving_specialist_id:
        try:
            from app.services.notifications import send_specialist_referral_notification
            send_specialist_referral_notification.delay(referral.id, payload.receiving_specialist_id)
        except Exception:
            pass

    return _load_referral(referral_id, db)


@router.post("/{referral_id}/complete", response_model=ReferralOut)
def complete_referral(
    referral_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("referrals:write")),
):
    """Mark an accepted referral as completed."""
    referral = db.query(Referral).filter(Referral.id == referral_id).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    specialist = db.query(Specialist).filter(Specialist.user_id == current_user.id).first()
    is_assigned = (
        (specialist and referral.receiving_specialist_id == specialist.id)
        or referral.assigned_doctor_id == current_user.id
        or current_user.role in {UserRole.ADMIN, UserRole.SUPER_ADMIN}
    )
    if not is_assigned:
        raise HTTPException(status_code=403, detail="Only the assigned recipient can complete this referral")

    if referral.status != ReferralStatus.ACCEPTED:
        raise HTTPException(status_code=400, detail="Referral must be ACCEPTED before marking complete")

    from datetime import datetime, timezone
    from app.models.referral_timeline import TimelineStatusType

    previous_status = referral.status.value
    referral.status = ReferralStatus.COMPLETED
    referral.feedback_status = FeedbackStatus.COMPLETED
    referral.completed_at = datetime.now(timezone.utc)

    referral_feedback_service.add_timeline_entry(
        db, referral=referral, actor=current_user,
        from_status=previous_status, to_status=ReferralStatus.COMPLETED.value,
        status_type=TimelineStatusType.WORKFLOW,
        note="Referral marked as completed",
    )
    db.commit()

    log_audit(
        db, user_id=current_user.id, action="referral_completed",
        resource_type="referral", resource_id=referral.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return _load_referral(referral_id, db)


@router.get("/registry/specialists", response_model=List[dict])
def list_registry_specialists(
    search: Optional[str] = Query(None),
    specialty: Optional[str] = Query(None),
    facility_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("referrals:read")),
):
    """Search all registry-eligible specialists for referral targeting."""
    query = (
        db.query(Specialist)
        .join(Specialist.user)
        .options(joinedload(Specialist.user), joinedload(Specialist.institution))
        .filter(Specialist.deleted_at.is_(None), User.is_active == True)
    )
    if search:
        query = query.filter(User.name.ilike(f"%{search}%"))
    if specialty:
        query = query.filter(Specialist.specialty == specialty.upper())
    if facility_id:
        query = query.filter(Specialist.institution_id == facility_id)

    results = query.offset(skip).limit(limit).all()
    return [
        {
            "id": s.id,
            "user_id": s.user_id,
            "name": s.user.name if s.user else None,
            "email": s.user.email if s.user else None,
            "role": s.user.role if s.user else None,
            "specialty": s.specialty,
            "subspecialties": s.subspecialties,
            "facility_id": s.institution_id,
            "facility_name": s.institution.facility_name if s.institution else None,
            "facility_city": s.institution.city if s.institution else None,
            "facility_region": s.institution.region if s.institution else None,
        }
        for s in results
    ]


@router.get("/registry/facilities", response_model=List[dict])
def list_registry_facilities(
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("referrals:read")),
):
    """Return only GASLID-approved active facilities for referral targeting."""
    today = __import__("datetime").date.today()
    eligible_ids = (
        db.query(NetworkRegistry.facility_id)
        .filter(
            NetworkRegistry.entity_type == NetworkEntityType.FACILITY,
            NetworkRegistry.verification_status == VerificationStatus.VERIFIED,
            NetworkRegistry.registry_status == RegistryStatus.ACTIVE,
            NetworkRegistry.membership_status == MembershipStatus.ACTIVE,
            NetworkRegistry.approval_status == ApprovalStatus.APPROVED_BY_GASLID,
            NetworkRegistry.expiry_date.isnot(None),
            NetworkRegistry.expiry_date >= today,
            NetworkRegistry.facility_id.isnot(None),
        )
        .subquery()
    )
    query = (
        db.query(Facility)
        .filter(
            Facility.id.in_(eligible_ids),
            Facility.deleted_at.is_(None),
            Facility.is_active.is_(True),
        )
    )
    if search:
        query = query.filter(Facility.facility_name.ilike(f"%{search}%"))
    results = query.order_by(Facility.facility_name).offset(skip).limit(limit).all()
    return [
        {
            "id": f.id,
            "facility_name": f.facility_name,
            "facility_type": f.facility_type,
            "city": f.city,
            "region": f.region,
        }
        for f in results
    ]


@router.get("/outgoing", response_model=List[ReferralOut])
def list_outgoing_referrals(
    status: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("referrals:read")),
):
    """Referrals initiated by the current user or their facility (admins can view all)."""
    query = db.query(Referral).options(
        joinedload(Referral.patient),
        joinedload(Referral.assigned_doctor),
        joinedload(Referral.referring_physician),
        joinedload(Referral.receiving_specialist),
        joinedload(Referral.receiving_facility),
    )

    if current_user.role in {UserRole.ADMIN, UserRole.SUPER_ADMIN}:
        pass
    else:
        if current_user.facility_id:
            query = query.filter(
                (Referral.created_by == current_user.id)
                | (Referral.referring_physician_id == current_user.id)
                | (Referral.facility_id == current_user.facility_id)
            )
        else:
            query = query.filter(
                (Referral.created_by == current_user.id)
                | (Referral.referring_physician_id == current_user.id)
            )

    if status:
        query = query.filter(Referral.status == status.upper())

    return query.order_by(Referral.created_at.desc()).offset(skip).limit(limit).all()
