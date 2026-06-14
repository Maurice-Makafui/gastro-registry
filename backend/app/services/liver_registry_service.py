from datetime import date
from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from app.models.liver_registry import LiverRegistry, LiverDiagnosis, LiverRiskFlag
from app.models.user import User
from app.schemas.liver_registry import LiverRegistryCreate, LiverRegistryUpdate, LiverRegistryScanResult


def _base_query(db: Session):
    return (
        db.query(LiverRegistry)
        .options(
            joinedload(LiverRegistry.patient),
            joinedload(LiverRegistry.recorder),
            joinedload(LiverRegistry.facility),
        )
        .filter(LiverRegistry.deleted_at.is_(None))
    )


def _to_decimal(value) -> Optional[Decimal]:
    if value is None:
        return None
    return Decimal(str(value))


def _detect_trend_alert(current: LiverRegistry, previous: LiverRegistry) -> bool:
    if current.afp is not None and previous.afp is not None:
        prev_afp = _to_decimal(previous.afp)
        curr_afp = _to_decimal(current.afp)
        if prev_afp and prev_afp > 0 and curr_afp and curr_afp >= prev_afp * Decimal("1.5"):
            return True

    if current.alt is not None and previous.alt is not None:
        prev_alt = _to_decimal(previous.alt)
        curr_alt = _to_decimal(current.alt)
        if prev_alt and prev_alt > 0 and curr_alt and curr_alt >= prev_alt * Decimal("2"):
            return True

    if current.ast is not None and previous.ast is not None:
        prev_ast = _to_decimal(previous.ast)
        curr_ast = _to_decimal(current.ast)
        if prev_ast and prev_ast > 0 and curr_ast and curr_ast >= prev_ast * Decimal("2"):
            return True

    if current.viral_load is not None and previous.viral_load is not None:
        prev_vl = _to_decimal(previous.viral_load)
        curr_vl = _to_decimal(current.viral_load)
        if prev_vl and prev_vl > 0 and curr_vl and curr_vl >= prev_vl * Decimal("10"):
            return True

    if current.fibroscan_score is not None and previous.fibroscan_score is not None:
        prev_fs = _to_decimal(previous.fibroscan_score)
        curr_fs = _to_decimal(current.fibroscan_score)
        if prev_fs and curr_fs and curr_fs - prev_fs >= Decimal("3"):
            return True

    return False


def evaluate_record_risk(db: Session, record: LiverRegistry, today: Optional[date] = None) -> LiverRiskFlag:
    today = today or date.today()

    previous = (
        db.query(LiverRegistry)
        .filter(
            LiverRegistry.patient_id == record.patient_id,
            LiverRegistry.id != record.id,
            LiverRegistry.deleted_at.is_(None),
        )
        .order_by(LiverRegistry.created_at.desc())
        .first()
    )

    if previous and _detect_trend_alert(record, previous):
        return LiverRiskFlag.TREND_ALERT

    if record.next_review_date < today:
        return LiverRiskFlag.OVERDUE

    return LiverRiskFlag.NORMAL


def run_risk_scan(db: Session) -> LiverRegistryScanResult:
    records = db.query(LiverRegistry).filter(LiverRegistry.deleted_at.is_(None)).all()
    overdue_count = 0
    trend_alert_count = 0
    normal_count = 0

    for record in records:
        flag = evaluate_record_risk(db, record)
        record.risk_flag = flag
        if flag == LiverRiskFlag.OVERDUE:
            overdue_count += 1
        elif flag == LiverRiskFlag.TREND_ALERT:
            trend_alert_count += 1
        else:
            normal_count += 1

    db.commit()

    return LiverRegistryScanResult(
        scanned_records=len(records),
        overdue_count=overdue_count,
        trend_alert_count=trend_alert_count,
        normal_count=normal_count,
    )


def list_liver_registry(
    db: Session,
    *,
    patient_id: Optional[int] = None,
    diagnosis: Optional[LiverDiagnosis] = None,
    risk_flag: Optional[LiverRiskFlag] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[LiverRegistry]:
    query = _base_query(db)
    if patient_id:
        query = query.filter(LiverRegistry.patient_id == patient_id)
    if diagnosis:
        query = query.filter(LiverRegistry.diagnosis == diagnosis)
    if risk_flag:
        query = query.filter(LiverRegistry.risk_flag == risk_flag)
    return query.order_by(LiverRegistry.next_review_date.asc()).offset(skip).limit(limit).all()


def get_liver_registry_by_id(db: Session, record_id: int) -> Optional[LiverRegistry]:
    return _base_query(db).filter(LiverRegistry.id == record_id).first()


def get_alerts(db: Session, limit: int = 100) -> list[LiverRegistry]:
    return (
        _base_query(db)
        .filter(LiverRegistry.risk_flag.in_([LiverRiskFlag.OVERDUE, LiverRiskFlag.TREND_ALERT]))
        .order_by(LiverRegistry.next_review_date.asc())
        .limit(limit)
        .all()
    )


def get_alert_summary(db: Session) -> dict:
    alerts = get_alerts(db)
    overdue_count = sum(1 for a in alerts if a.risk_flag == LiverRiskFlag.OVERDUE)
    trend_alert_count = sum(1 for a in alerts if a.risk_flag == LiverRiskFlag.TREND_ALERT)
    return {
        "total_alerts": len(alerts),
        "overdue_count": overdue_count,
        "trend_alert_count": trend_alert_count,
        "alerts": alerts,
    }


def create_liver_registry(db: Session, user: User, payload: LiverRegistryCreate) -> LiverRegistry:
    record = LiverRegistry(
        patient_id=payload.patient_id,
        facility_id=payload.facility_id,
        recorded_by=user.id,
        diagnosis=payload.diagnosis,
        fibroscan_score=payload.fibroscan_score,
        viral_load=payload.viral_load,
        afp=payload.afp,
        alt=payload.alt,
        ast=payload.ast,
        ultrasound_date=payload.ultrasound_date,
        next_review_date=payload.next_review_date,
    )
    db.add(record)
    db.flush()
    record.risk_flag = evaluate_record_risk(db, record)
    db.commit()
    db.refresh(record)
    return get_liver_registry_by_id(db, record.id) or record


def update_liver_registry(
    db: Session,
    record: LiverRegistry,
    payload: LiverRegistryUpdate,
) -> LiverRegistry:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    record.risk_flag = evaluate_record_risk(db, record)
    db.commit()
    db.refresh(record)
    return record
