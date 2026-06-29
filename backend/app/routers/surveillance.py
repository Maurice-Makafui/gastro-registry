from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, text, case
from datetime import date, timedelta
from typing import Optional

from app.database import get_db
from app.models.user import User, UserRole
from app.models.facility import Facility
from app.models.liver_registry import LiverRegistry, LiverDiagnosis, LiverRiskFlag
from app.models.referral import Referral, ReferralStatus
from app.models.followup import FollowUp
from app.models.procedure import Procedure, ProcedureType
from app.models.specialist import Specialist
from app.core.rbac import require_permission
from app.core.audit import log_audit
from app.schemas.surveillance import (
    SurveillanceDashboard,
    SurveillanceKPIs,
    DiseaseTrendPoint,
    FacilityLoad,
    RegionalBurden,
    ReferralFlowEdge,
    UserAdminOut,
    UserRoleUpdate,
    UserActiveToggle,
)
from typing import List

router = APIRouter(prefix="/surveillance", tags=["Surveillance"])


# ── helpers ───────────────────────────────────────────────────────────────────

def _count_liver(db: Session, diagnosis: LiverDiagnosis) -> int:
    return (
        db.query(func.count(func.distinct(LiverRegistry.patient_id)))
        .filter(LiverRegistry.diagnosis == diagnosis, LiverRegistry.deleted_at.is_(None))
        .scalar() or 0
    )


# ── Main surveillance dashboard ───────────────────────────────────────────────

@router.get("/dashboard", response_model=SurveillanceDashboard)
def get_surveillance_dashboard(
    request: Request,
    weeks: int = Query(12, ge=4, le=52),
    facility_id: Optional[int] = Query(None),
    region: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("surveillance:read")),
):
    log_audit(
        db,
        user_id=current_user.id,
        action="surveillance_dashboard_access",
        resource_type="surveillance",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"weeks": weeks, "facility_id": facility_id, "region": region},
    )

    cutoff = date.today() - timedelta(weeks=weeks)

    # CRITICAL facility data isolation (except SUPER_ADMIN)
    scoped_facility_id = None
    if str(current_user.role) != str(UserRole.SUPER_ADMIN):
        scoped_facility_id = current_user.facility_id
        if scoped_facility_id is None:
            raise HTTPException(status_code=403, detail="No facility context for user")

    # ── Base liver query with optional facility/region filter ─────────────────
    # Server-side override: client-provided facility_id cannot expand scope.
    def _liver_base():
        q = db.query(LiverRegistry).filter(LiverRegistry.deleted_at.is_(None))
        effective_facility_id = facility_id
        if scoped_facility_id is not None:
            effective_facility_id = scoped_facility_id
        if effective_facility_id:
            q = q.filter(LiverRegistry.facility_id == effective_facility_id)
        if region:
            q = q.join(Facility, LiverRegistry.facility_id == Facility.id).filter(Facility.region == region)
        return q


    # ── KPIs ──────────────────────────────────────────────────────────────────
    total_liver = _liver_base().with_entities(func.count(func.distinct(LiverRegistry.patient_id))).scalar() or 0

    gi_bleeding_count = (
        db.query(func.count(func.distinct(Referral.patient_id)))
        .filter(Referral.symptoms.cast(text("text")).ilike("%vomiting_blood%"))
        .scalar() or 0
    )

    hcc_count = _liver_base().filter(LiverRegistry.diagnosis == LiverDiagnosis.HCC).with_entities(
        func.count(func.distinct(LiverRegistry.patient_id))
    ).scalar() or 0

    proc_q = db.query(func.count(Procedure.id)).filter(Procedure.deleted_at.is_(None))
    if scoped_facility_id is not None:
        proc_q = proc_q.filter(Procedure.facility_id == scoped_facility_id)
    elif facility_id:
        proc_q = proc_q.filter(Procedure.facility_id == facility_id)

    total_procedures = proc_q.scalar() or 0

    missed_followups = (
        db.query(func.count(FollowUp.id))
        .filter(FollowUp.status == "MISSED")
        .scalar() or 0
    )

    pending_referrals_q = (
        db.query(func.count(Referral.id))
        .filter(Referral.status == ReferralStatus.PENDING)
    )
    if scoped_facility_id is not None:
        pending_referrals_q = pending_referrals_q.filter(Referral.facility_id == scoped_facility_id)
    pending_referrals = pending_referrals_q.scalar() or 0


    delay_q = (
        db.query(func.avg(
            func.extract("epoch", func.now() - Referral.created_at) / 86400
        ))
        .filter(Referral.status == ReferralStatus.PENDING)
    )
    if scoped_facility_id is not None:
        delay_q = delay_q.filter(Referral.facility_id == scoped_facility_id)
    delay_result = delay_q.scalar()

    avg_delay = round(float(delay_result or 0), 1)

    total_endoscopy = (
        db.query(func.count(Procedure.id))
        .filter(
            Procedure.deleted_at.is_(None),
            Procedure.procedure_type.in_([ProcedureType.GASTROSCOPY, ProcedureType.COLONOSCOPY]),
        )
        .scalar() or 0
    )
    scheduled_endoscopy_refs = (
        db.query(func.count(Referral.id))
        .filter(Referral.status == ReferralStatus.SCHEDULED)
        .scalar() or 1
    )
    completion_rate = round(min(100.0, (total_endoscopy / scheduled_endoscopy_refs) * 100), 1)

    kpis = SurveillanceKPIs(
        total_liver_cases=total_liver,
        total_gi_bleeding_cases=gi_bleeding_count,
        total_hcc_cases=hcc_count,
        total_procedures=total_procedures,
        missed_followups=missed_followups,
        pending_referrals=pending_referrals,
        avg_referral_delay_days=avg_delay,
        endoscopy_completion_rate=completion_rate,
    )

    # ── Disease trend — weekly counts from liver_registry ────────────────────
    trend_q = (
        db.query(
            func.to_char(LiverRegistry.created_at, "IYYY-IW").label("period"),
            LiverRegistry.diagnosis,
            func.count(func.distinct(LiverRegistry.patient_id)).label("cnt"),
        )
        .filter(LiverRegistry.created_at >= cutoff, LiverRegistry.deleted_at.is_(None))
        .group_by(text("period"), LiverRegistry.diagnosis)
        .order_by(text("period"))
    )
    # Apply facility scope override
    if scoped_facility_id is not None:
        trend_q = trend_q.filter(LiverRegistry.facility_id == scoped_facility_id)
    elif facility_id:
        trend_q = trend_q.filter(LiverRegistry.facility_id == facility_id)
    if region:
        trend_q = trend_q.join(Facility, LiverRegistry.facility_id == Facility.id).filter(Facility.region == region)
    trend_rows = trend_q.all()

    # Aggregate into period → dict
    period_map: dict[str, dict] = {}
    for row in trend_rows:
        p = period_map.setdefault(row.period, {"hep_b": 0, "hep_c": 0, "cirrhosis": 0, "hcc": 0, "gi_bleeding": 0})
        if row.diagnosis == LiverDiagnosis.HEP_B:
            p["hep_b"] += row.cnt
        elif row.diagnosis == LiverDiagnosis.HEP_C:
            p["hep_c"] += row.cnt
        elif row.diagnosis == LiverDiagnosis.CIRRHOSIS:
            p["cirrhosis"] += row.cnt
        elif row.diagnosis == LiverDiagnosis.HCC:
            p["hcc"] += row.cnt

    disease_trend = [
        DiseaseTrendPoint(period=k, **v)
        for k, v in sorted(period_map.items())
    ]

    # ── Facility loads ────────────────────────────────────────────────────────
    facilities = (
        db.query(Facility)
        .filter(Facility.deleted_at.is_(None), Facility.is_active.is_(True))
        .all()
    )
    if region:
        facilities = [f for f in facilities if f.region == region]

    facility_loads: list[FacilityLoad] = []
    for fac in facilities:
        ref_cnt = db.query(func.count(Referral.id)).filter(Referral.facility_id == fac.id).scalar() or 0
        proc_cnt = db.query(func.count(Procedure.id)).filter(
            Procedure.facility_id == fac.id, Procedure.deleted_at.is_(None)
        ).scalar() or 0
        liver_cnt = db.query(func.count(func.distinct(LiverRegistry.patient_id))).filter(
            LiverRegistry.facility_id == fac.id, LiverRegistry.deleted_at.is_(None)
        ).scalar() or 0
        spec_cnt = db.query(func.count(Specialist.id)).filter(
            Specialist.institution_id == fac.id, Specialist.deleted_at.is_(None)
        ).scalar() or 0
        facility_loads.append(FacilityLoad(
            facility_id=fac.id,
            facility_name=fac.facility_name,
            region=fac.region,
            city=fac.city,
            referral_count=ref_cnt,
            procedure_count=proc_cnt,
            liver_case_count=liver_cnt,
            specialist_count=spec_cnt,
        ))
    facility_loads.sort(key=lambda x: -(x.referral_count + x.procedure_count))

    # ── Regional burden ───────────────────────────────────────────────────────
    reg_q = (
        db.query(
            Facility.region,
            LiverRegistry.diagnosis,
            func.count(func.distinct(LiverRegistry.patient_id)).label("cnt"),
        )
        .join(LiverRegistry, LiverRegistry.facility_id == Facility.id)
        .filter(LiverRegistry.deleted_at.is_(None))
        .group_by(Facility.region, LiverRegistry.diagnosis)
    )
    if scoped_facility_id is not None:
        reg_q = reg_q.filter(LiverRegistry.facility_id == scoped_facility_id)
    reg_rows = reg_q.all()

    reg_map: dict[str, dict] = {}
    for row in reg_rows:
        r = reg_map.setdefault(row.region, {"hep_b": 0, "hep_c": 0, "cirrhosis": 0, "hcc": 0})
        if row.diagnosis == LiverDiagnosis.HEP_B:
            r["hep_b"] += row.cnt
        elif row.diagnosis == LiverDiagnosis.HEP_C:
            r["hep_c"] += row.cnt
        elif row.diagnosis == LiverDiagnosis.CIRRHOSIS:
            r["cirrhosis"] += row.cnt
        elif row.diagnosis == LiverDiagnosis.HCC:
            r["hcc"] += row.cnt

    regional_burden = [
        RegionalBurden(
            region=k,
            total_cases=sum(v.values()),
            **v,
        )
        for k, v in sorted(reg_map.items())
    ]

    # ── Referral flow between facilities ──────────────────────────────────────
    flow_q = (
        db.query(
            Referral.source_facility,
            Facility.facility_name.label("target_name"),
            func.count(Referral.id).label("cnt"),
        )
        .join(Facility, Referral.facility_id == Facility.id)
        .filter(Referral.source_facility.isnot(None))
        .group_by(Referral.source_facility, Facility.facility_name)
        .order_by(text("cnt DESC"))
        .limit(20)
    )
    if scoped_facility_id is not None:
        flow_q = flow_q.filter(Referral.facility_id == scoped_facility_id)
    flow_rows = flow_q.all()

    referral_flows = [
        ReferralFlowEdge(source_facility=r.source_facility, target_facility=r.target_name, count=r.cnt)
        for r in flow_rows
    ]

    # ── Risk flag counts ──────────────────────────────────────────────────────
    flag_q = (
        db.query(LiverRegistry.risk_flag, func.count(LiverRegistry.id).label("cnt"))
        .filter(LiverRegistry.deleted_at.is_(None))
        .group_by(LiverRegistry.risk_flag)
    )
    if scoped_facility_id is not None:
        flag_q = flag_q.filter(LiverRegistry.facility_id == scoped_facility_id)
    flag_rows = flag_q.all()

    risk_flag_counts = {row.risk_flag.value: row.cnt for row in flag_rows}

    return SurveillanceDashboard(
        kpis=kpis,
        disease_trend=disease_trend,
        facility_loads=facility_loads,
        regional_burden=regional_burden,
        referral_flows=referral_flows,
        risk_flag_counts=risk_flag_counts,
    )


# ── User management (role hierarchy + permission boundaries) ───────────────

from app.core.admin_user_guard import (
    can_change_target_role,
    can_manage_user,
    prevent_lockout_last_super_admin,
)


@router.get("/users", response_model=List[UserAdminOut])
def list_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:read")),
):
    # Super Admin sees everything. Facility Admin is facility-scoped.
    actor_role = UserRole(current_user.role)
    q = db.query(User, Facility.facility_name).outerjoin(Facility, User.facility_id == Facility.id)
    q = q.filter(User.deleted_at.is_(None))
    if actor_role == UserRole.FACILITY_ADMIN:
        if current_user.facility_id is None:
            raise HTTPException(status_code=403, detail="Facility context missing")
        q = q.filter(User.facility_id == current_user.facility_id)
    elif actor_role == UserRole.PLATFORM_ADMIN:
        # Platform Admin still sees all non-deleted users, but guarded per-action for SUPER_ADMIN modifications.
        pass
    else:
        # Legacy ADMIN (if any) treated as full admin for backward compatibility.
        pass

    rows = (
        q.order_by(User.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        UserAdminOut(
            id=u.id,
            name=u.name,
            email=u.email,
            role=u.role.value if hasattr(u.role, "value") else str(u.role),
            department=u.department,
            facility_id=u.facility_id,
            facility_name=fname,
            is_active=u.is_active,
        )
        for u, fname in rows
    ]


@router.patch("/users/{user_id}/role", response_model=UserAdminOut)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:write")),
):
    from fastapi import HTTPException

    target_user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    new_role = UserRole(payload.role)

    can_manage_user(current_user, target_user)
    can_change_target_role(current_user, target_user, new_role)

    old_role = target_user.role
    target_user.role = new_role
    db.commit()

    log_audit(
        db,
        user_id=current_user.id,
        action="user_role_changed",
        resource_type="user",
        resource_id=user_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"from_role": str(old_role), "to_role": payload.role},
    )

    return UserAdminOut(
        id=target_user.id,
        name=target_user.name,
        email=target_user.email,
        role=target_user.role.value,
        department=target_user.department,
        facility_id=target_user.facility_id,
        is_active=target_user.is_active,
    )


@router.patch("/users/{user_id}/active", response_model=UserAdminOut)
def toggle_user_active(
    user_id: int,
    payload: UserActiveToggle,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("users:write")),
):
    from fastapi import HTTPException

    target_user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    can_manage_user(current_user, target_user)

    # Prevent lock-out: only relevant when current target is a SUPER_ADMIN.
    if payload.is_active is False:
        prevent_lockout_last_super_admin(db, current_user, target_user)

    old_active = target_user.is_active
    target_user.is_active = payload.is_active
    db.commit()

    log_audit(
        db,
        user_id=current_user.id,
        action="user_active_toggled",
        resource_type="user",
        resource_id=user_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"from_is_active": old_active, "to_is_active": payload.is_active},
    )

    return UserAdminOut(
        id=target_user.id,
        name=target_user.name,
        email=target_user.email,
        role=target_user.role.value if hasattr(target_user.role, "value") else str(target_user.role),
        department=target_user.department,
        facility_id=target_user.facility_id,
        is_active=target_user.is_active,
    )

