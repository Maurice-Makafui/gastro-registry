from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.facility import Facility, FacilityType
from app.models.user import User, UserRole
from app.models.referral import Referral
from app.core.permissions import SPECIALIST_ROLES
from app.schemas.facility import FacilityCreate, FacilityUpdate, FacilityDetail, FacilityNetworkStats


def _active_facilities_query(db: Session):
    return db.query(Facility).filter(Facility.deleted_at.is_(None))


def list_facilities(
    db: Session,
    *,
    region: Optional[str] = None,
    city: Optional[str] = None,
    facility_type: Optional[FacilityType] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Facility]:
    query = _active_facilities_query(db)
    if region:
        query = query.filter(Facility.region.ilike(f"%{region}%"))
    if city:
        query = query.filter(Facility.city.ilike(f"%{city}%"))
    if facility_type:
        query = query.filter(Facility.facility_type == facility_type)
    if search:
        query = query.filter(Facility.facility_name.ilike(f"%{search}%"))
    return query.order_by(Facility.facility_name.asc()).offset(skip).limit(limit).all()


def get_facility_by_id(db: Session, facility_id: int) -> Optional[Facility]:
    return (
        _active_facilities_query(db)
        .filter(Facility.id == facility_id)
        .first()
    )


def get_facility_detail(db: Session, facility_id: int) -> Optional[FacilityDetail]:
    facility = get_facility_by_id(db, facility_id)
    if not facility:
        return None

    roster = (
        db.query(User)
        .filter(
            User.facility_id == facility_id,
            User.deleted_at.is_(None),
            User.is_active.is_(True),
            User.role.in_(list(SPECIALIST_ROLES)),
        )
        .order_by(User.name.asc())
        .all()
    )

    referral_count = (
        db.query(func.count(Referral.id))
        .filter(Referral.facility_id == facility_id)
        .scalar()
        or 0
    )

    return FacilityDetail(
        id=facility.id,
        facility_name=facility.facility_name,
        facility_type=facility.facility_type,
        region=facility.region,
        city=facility.city,
        email=facility.email,
        phone=facility.phone,
        metadata=facility.metadata_json or {},
        is_active=facility.is_active,
        created_at=facility.created_at,
        updated_at=facility.updated_at,
        specialist_count=len(roster),
        referral_count=referral_count,
        roster=roster,
    )


def create_facility(db: Session, payload: FacilityCreate) -> Facility:
    facility = Facility(
        facility_name=payload.facility_name,
        facility_type=payload.facility_type,
        region=payload.region,
        city=payload.city,
        email=payload.email,
        phone=payload.phone,
        metadata_json=payload.metadata,
    )
    db.add(facility)
    db.commit()
    db.refresh(facility)
    return facility


def update_facility(db: Session, facility: Facility, payload: FacilityUpdate) -> Facility:
    update_data = payload.model_dump(exclude_unset=True)
    if "metadata" in update_data:
        facility.metadata_json = update_data.pop("metadata")
    for field, value in update_data.items():
        setattr(facility, field, value)
    db.commit()
    db.refresh(facility)
    return facility


def soft_delete_facility(db: Session, facility: Facility) -> Facility:
    facility.deleted_at = datetime.now(timezone.utc)
    facility.is_active = False
    db.commit()
    db.refresh(facility)
    return facility


def get_network_stats(db: Session) -> FacilityNetworkStats:
    facilities = _active_facilities_query(db).all()

    facilities_by_type: dict[str, int] = {}
    facilities_by_region: dict[str, int] = {}
    for facility in facilities:
        type_key = facility.facility_type.value
        facilities_by_type[type_key] = facilities_by_type.get(type_key, 0) + 1
        facilities_by_region[facility.region] = facilities_by_region.get(facility.region, 0) + 1

    total_specialists = (
        db.query(func.count(User.id))
        .filter(
            User.deleted_at.is_(None),
            User.is_active.is_(True),
            User.role.in_(list(SPECIALIST_ROLES)),
        )
        .scalar()
        or 0
    )

    total_referrals = db.query(func.count(Referral.id)).scalar() or 0

    return FacilityNetworkStats(
        total_facilities=len(facilities),
        active_facilities=sum(1 for f in facilities if f.is_active),
        facilities_by_type=facilities_by_type,
        facilities_by_region=facilities_by_region,
        total_specialists=total_specialists,
        total_referrals=total_referrals,
    )
