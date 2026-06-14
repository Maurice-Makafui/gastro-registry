from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case, text
from datetime import date, timedelta
from typing import List

from app.database import get_db
from app.models.patient import Patient
from app.models.referral import Referral, ReferralStatus, RiskLevel
from app.models.followup import FollowUp
from app.models.procedure import Procedure, ProcedureType
from app.models.facility import Facility
from app.models.liver_registry import LiverRegistry, LiverDiagnosis
from app.models.patient_registry import PatientRegistry, RegistryType
from app.models.user import User
from app.core.rbac import require_permission
from app.schemas import AnalyticsSummary, ReferralOut
from app.schemas.analytics import (
    AnalyticsDashboard,
    TimeSeriesPoint,
    NameValuePair,
    FacilityProcedureVolume,
    ReferralBottleneck,
    DiseaseBurden,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ── Legacy summary (kept for admin dashboard backward-compat) ─────────────────

def _count(db: Session, model, filter_=None):
    q = db.query(func.count(model.id))
    return q.filter(filter_).scalar() if filter_ is not None else q.scalar()


@router.get("/summary", response_model=AnalyticsSummary)
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("analytics:read")),
):
    today = date.today()
    recent = (
        db.query(Referral)
        .options(joinedload(Referral.patient), joinedload(Referral.assigned_doctor))
        .order_by(Referral.created_at.desc())
        .limit(10)
        .all()
    )
    return AnalyticsSummary(
        total_patients=_count(db, Patient),
        total_referrals=_count(db, Referral),
        pending_referrals=_count(db, Referral, Referral.status == ReferralStatus.PENDING),
        high_risk_referrals=_count(db, Referral, Referral.risk_level == RiskLevel.HIGH),
        medium_risk_referrals=_count(db, Referral, Referral.risk_level == RiskLevel.MEDIUM),
        low_risk_referrals=_count(db, Referral, Referral.risk_level == RiskLevel.LOW),
        completed_referrals=_count(db, Referral, Referral.status == ReferralStatus.COMPLETED),
        referrals_today=_count(db, Referral, func.date(Referral.created_at) == today),
        upcoming_followups=_count(
            db, FollowUp,
            (FollowUp.next_visit_date >= today) & (FollowUp.status == "SCHEDULED"),
        ),
        referrals_by_status={s.value: _count(db, Referral, Referral.status == s) for s in ReferralStatus},
        referrals_by_risk={r.value: _count(db, Referral, Referral.risk_level == r) for r in RiskLevel},
        recent_referrals=[ReferralOut.model_validate(r) for r in recent],
    )


# ── New aggregated dashboard ──────────────────────────────────────────────────

@router.get("/dashboard", response_model=AnalyticsDashboard)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("analytics:read")),
):
    # ── KPIs ──────────────────────────────────────────────────────────────────
    total_patients = db.query(func.count(Patient.id)).scalar() or 0
    total_referrals = db.query(func.count(Referral.id)).scalar() or 0
    total_procedures = db.query(func.count(Procedure.id)).filter(Procedure.deleted_at.is_(None)).scalar() or 0
    total_liver_records = db.query(func.count(LiverRegistry.id)).filter(LiverRegistry.deleted_at.is_(None)).scalar() or 0

    # ── Referral trend — last 12 ISO weeks ───────────────────────────────────
    cutoff = date.today() - timedelta(weeks=12)
    weekly_rows = (
        db.query(
            func.to_char(Referral.created_at, "IYYY-IW").label("week"),
            func.count(Referral.id).label("cnt"),
        )
        .filter(Referral.created_at >= cutoff)
        .group_by(text("week"))
        .order_by(text("week"))
        .all()
    )
    referral_trend = [TimeSeriesPoint(label=r.week, value=r.cnt) for r in weekly_rows]

    # ── Facility procedure volumes ────────────────────────────────────────────
    facility_rows = (
        db.query(
            Facility.id,
            Facility.facility_name,
            Facility.city,
            Procedure.procedure_type,
            func.count(Procedure.id).label("cnt"),
        )
        .join(Procedure, Procedure.facility_id == Facility.id)
        .filter(Procedure.deleted_at.is_(None))
        .group_by(Facility.id, Facility.facility_name, Facility.city, Procedure.procedure_type)
        .all()
    )
    fac_map: dict[int, FacilityProcedureVolume] = {}
    for row in facility_rows:
        if row.id not in fac_map:
            fac_map[row.id] = FacilityProcedureVolume(
                facility_id=row.id, facility_name=row.facility_name, city=row.city
            )
        obj = fac_map[row.id]
        setattr(obj, row.procedure_type.value, row.cnt)
        obj.total += row.cnt
    facility_procedure_volumes = sorted(fac_map.values(), key=lambda x: -x.total)[:10]

    # ── Referral bottlenecks (status + avg age in days) ───────────────────────
    bottleneck_rows = (
        db.query(
            Referral.status,
            func.count(Referral.id).label("cnt"),
            func.avg(
                func.extract("epoch", func.now() - Referral.created_at) / 86400
            ).label("avg_days"),
        )
        .group_by(Referral.status)
        .all()
    )
    referral_bottlenecks = [
        ReferralBottleneck(
            status=row.status.value,
            count=row.cnt,
            avg_age_days=round(float(row.avg_days or 0), 1),
        )
        for row in bottleneck_rows
    ]

    # ── Disease burden from patient_registries ────────────────────────────────
    burden_rows = (
        db.query(
            PatientRegistry.registry_type,
            func.count(func.distinct(PatientRegistry.patient_id)).label("cnt"),
        )
        .group_by(PatientRegistry.registry_type)
        .all()
    )
    disease_burden = [
        DiseaseBurden(registry_type=row.registry_type.value, patient_count=row.cnt)
        for row in burden_rows
    ]

    # ── Liver diagnosis breakdown ─────────────────────────────────────────────
    liver_rows = (
        db.query(LiverRegistry.diagnosis, func.count(LiverRegistry.id).label("cnt"))
        .filter(LiverRegistry.deleted_at.is_(None))
        .group_by(LiverRegistry.diagnosis)
        .all()
    )
    liver_diagnosis_breakdown = [NameValuePair(name=r.diagnosis.value, value=r.cnt) for r in liver_rows]

    # ── Risk distribution ─────────────────────────────────────────────────────
    risk_rows = (
        db.query(Referral.risk_level, func.count(Referral.id).label("cnt"))
        .group_by(Referral.risk_level)
        .all()
    )
    risk_distribution = [NameValuePair(name=r.risk_level.value, value=r.cnt) for r in risk_rows]

    # ── Procedure type breakdown ──────────────────────────────────────────────
    proc_rows = (
        db.query(Procedure.procedure_type, func.count(Procedure.id).label("cnt"))
        .filter(Procedure.deleted_at.is_(None))
        .group_by(Procedure.procedure_type)
        .all()
    )
    procedure_type_breakdown = [NameValuePair(name=r.procedure_type.value, value=r.cnt) for r in proc_rows]

    return AnalyticsDashboard(
        total_patients=total_patients,
        total_referrals=total_referrals,
        total_procedures=total_procedures,
        total_liver_records=total_liver_records,
        referral_trend=referral_trend,
        facility_procedure_volumes=facility_procedure_volumes,
        referral_bottlenecks=referral_bottlenecks,
        disease_burden=disease_burden,
        liver_diagnosis_breakdown=liver_diagnosis_breakdown,
        risk_distribution=risk_distribution,
        procedure_type_breakdown=procedure_type_breakdown,
    )
