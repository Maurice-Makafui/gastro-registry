from typing import Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.models.specialist import Specialist, Specialty
from app.models.user import User
from app.schemas.specialist import SpecialistCreate, SpecialistUpdate


def _base_query(db: Session):
    return (
        db.query(Specialist)
        .options(
            joinedload(Specialist.user),
            joinedload(Specialist.institution),
        )
        .filter(Specialist.deleted_at.is_(None))
    )


def list_specialists(
    db: Session,
    *,
    search: Optional[str] = None,
    specialty: Optional[Specialty] = None,
    institution_id: Optional[int] = None,
    subspecialty: Optional[str] = None,
    interest: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Specialist]:
    query = _base_query(db).join(User, Specialist.user_id == User.id).filter(Specialist.is_public.is_(True))

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                User.name.ilike(pattern),
                Specialist.bio.ilike(pattern),
                Specialist.email.ilike(pattern),
            )
        )

    if specialty:
        query = query.filter(Specialist.specialty == specialty)

    if institution_id:
        query = query.filter(Specialist.institution_id == institution_id)

    if subspecialty:
        query = query.filter(Specialist.subspecialties.any(subspecialty))

    if interest:
        query = query.filter(Specialist.interests.any(interest))

    return query.order_by(User.name.asc()).offset(skip).limit(limit).all()


def get_specialist_by_id(db: Session, specialist_id: int) -> Optional[Specialist]:
    return (
        _base_query(db)
        .filter(Specialist.id == specialist_id, Specialist.is_public.is_(True))
        .first()
    )


def get_specialist_by_user_id(db: Session, user_id: int) -> Optional[Specialist]:
    return _base_query(db).filter(Specialist.user_id == user_id).first()


def create_specialist(db: Session, user: User, payload: SpecialistCreate) -> Specialist:
    existing = get_specialist_by_user_id(db, user.id)
    if existing:
        raise ValueError("Specialist profile already exists for this user")

    specialist = Specialist(
        user_id=user.id,
        specialty=payload.specialty,
        subspecialties=payload.subspecialties,
        institution_id=payload.institution_id,
        phone=payload.phone or user.phone,
        email=payload.email or user.email,
        bio=payload.bio,
        interests=payload.interests,
        is_public=payload.is_public,
    )
    db.add(specialist)
    db.commit()
    db.refresh(specialist)
    return get_specialist_by_id(db, specialist.id) or specialist


def update_specialist(
    db: Session,
    specialist: Specialist,
    payload: SpecialistUpdate,
) -> Specialist:
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(specialist, field, value)
    db.commit()
    db.refresh(specialist)
    return specialist
