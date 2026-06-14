"""
Seed the database with demo facilities, users, and specialists on startup.
"""
import logging
import os
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.facility import Facility, FacilityType
from app.models.specialist import Specialist, Specialty
from app.models.patient import Patient
from app.models.procedure import Procedure, ProcedureType
from app.models.liver_registry import LiverRegistry, LiverDiagnosis, LiverRiskFlag
from app.core.security import get_password_hash
from app.core.permissions import SPECIALIST_ROLES
from datetime import date, timedelta

logger = logging.getLogger(__name__)

DEMO_FACILITIES = [
    {
        "facility_name": "Korle Bu Teaching Hospital",
        "facility_type": FacilityType.HOSPITAL,
        "region": "Greater Accra",
        "city": "Accra",
        "email": "info@kbth.gov.gh",
        "phone": "+233302665401",
        "metadata": {"beds": 2000, "gi_unit": True},
    },
    {
        "facility_name": "Komfo Anokye Teaching Hospital",
        "facility_type": FacilityType.HOSPITAL,
        "region": "Ashanti",
        "city": "Kumasi",
        "email": "info@kathhospital.org.gh",
        "phone": "+233322020000",
        "metadata": {"beds": 1200, "gi_unit": True},
    },
    {
        "facility_name": "Accra Gastro Clinic",
        "facility_type": FacilityType.CLINIC,
        "region": "Greater Accra",
        "city": "Accra",
        "email": "contact@accra-gastro.gh",
        "phone": "+233302123456",
        "metadata": {"specialty_focus": "hepatology"},
    },
    {
        "facility_name": "Dr. Mensah Private Practice",
        "facility_type": FacilityType.PRIVATE,
        "region": "Western",
        "city": "Takoradi",
        "email": "dr.mensah@private.gh",
        "phone": "+233312345678",
        "metadata": {},
    },
]

DEMO_USERS = [
    {
        "name": "Admin User",
        "email": "admin@gastro.gh",
        "password_env": "SEED_ADMIN_PASSWORD",
        "role": UserRole.ADMIN,
        "department": "Administration",
        "facility_index": 0,
    },
    {
        "name": "Dr. Kwame Asante",
        "email": "doctor@gastro.gh",
        "password_env": "SEED_DOCTOR_PASSWORD",
        "role": UserRole.GASTROENTEROLOGIST,
        "department": "Gastroenterology",
        "facility_index": 0,
    },
    {
        "name": "Dr. Ama Owusu",
        "email": "hepato@gastro.gh",
        "password_env": "SEED_HEPATO_PASSWORD",
        "role": UserRole.HEPATOLOGIST,
        "department": "Hepatology",
        "facility_index": 1,
    },
    {
        "name": "Dr. Kofi Referrer",
        "email": "referrer@gastro.gh",
        "password_env": "SEED_REFERRER_PASSWORD",
        "role": UserRole.REFERRING_PHYSICIAN,
        "department": "Internal Medicine",
        "facility_index": 2,
    },
    {
        "name": "Nurse Abena Mensah",
        "email": "nurse@gastro.gh",
        "password_env": "SEED_NURSE_PASSWORD",
        "role": UserRole.NURSE,
        "department": "Outpatient",
        "facility_index": 0,
    },
]

DEMO_SPECIALISTS = [
    {
        "email": "doctor@gastro.gh",
        "specialty": Specialty.GASTROENTEROLOGY,
        "subspecialties": ["Advanced Endoscopy", "Inflammatory Bowel Disease"],
        "interests": ["Colonoscopy", "ERCP", "IBD"],
        "bio": "Consultant gastroenterologist with 15 years of experience in advanced endoscopic procedures.",
    },
    {
        "email": "hepato@gastro.gh",
        "specialty": Specialty.HEPATOLOGY,
        "subspecialties": ["Transplant Hepatology", "Viral Hepatitis"],
        "interests": ["Hepatitis B", "Cirrhosis", "HCC surveillance"],
        "bio": "Hepatologist specializing in chronic liver disease management and HCC surveillance programmes.",
    },
]


def _seed_facilities_if_empty(db: Session) -> list[Facility]:
    if db.query(Facility).first():
        return db.query(Facility).all()

    logger.info("Seeding demo facilities...")
    facilities: list[Facility] = []
    for facility_data in DEMO_FACILITIES:
        facility = Facility(
            facility_name=facility_data["facility_name"],
            facility_type=facility_data["facility_type"],
            region=facility_data["region"],
            city=facility_data["city"],
            email=facility_data["email"],
            phone=facility_data["phone"],
            metadata_json=facility_data["metadata"],
        )
        db.add(facility)
        facilities.append(facility)
    db.commit()
    for facility in facilities:
        db.refresh(facility)
    return facilities


def _seed_specialists_for_users(db: Session) -> None:
    if db.query(Specialist).first():
        return

    for spec_data in DEMO_SPECIALISTS:
        user = db.query(User).filter(User.email == spec_data["email"]).first()
        if not user or not user.facility_id:
            continue
        specialist = Specialist(
            user_id=user.id,
            specialty=spec_data["specialty"],
            subspecialties=spec_data["subspecialties"],
            institution_id=user.facility_id,
            phone=user.phone,
            email=user.email,
            bio=spec_data["bio"],
            interests=spec_data["interests"],
            is_public=True,
        )
        db.add(specialist)

    for user in db.query(User).filter(User.role.in_(list(SPECIALIST_ROLES))).all():
        existing = db.query(Specialist).filter(Specialist.user_id == user.id).first()
        if existing or not user.facility_id:
            continue
        if user.role == UserRole.HEPATOLOGIST:
            specialty = Specialty.HEPATOLOGY
        elif user.role == UserRole.GASTROENTEROLOGIST:
            specialty = Specialty.GASTROENTEROLOGY
        else:
            specialty = Specialty.GASTROENTEROLOGY
        db.add(
            Specialist(
                user_id=user.id,
                specialty=specialty,
                subspecialties=[],
                institution_id=user.facility_id,
                phone=user.phone,
                email=user.email,
                bio=f"{user.name} — {user.department or 'GI Specialist'}",
                interests=[],
                is_public=True,
            )
        )

    db.commit()
    logger.info("Specialist directory profiles seeded")


def _seed_clinical_demo_data(db: Session) -> None:
    if db.query(LiverRegistry).first() or db.query(Procedure).first():
        return

    doctor = db.query(User).filter(User.email == "doctor@gastro.gh").first()
    hepato = db.query(User).filter(User.email == "hepato@gastro.gh").first()
    facility = db.query(Facility).first()

    if not doctor or not hepato or not facility:
        return

    kofi = db.query(Patient).filter(Patient.full_name == "Kofi Asante").first()
    kwame = db.query(Patient).filter(Patient.full_name == "Kwame Osei").first()
    akosua = db.query(Patient).filter(Patient.full_name == "Akosua Darko").first()

    today = date.today()

    if kofi and doctor:
        db.add(
            Procedure(
                patient_id=kofi.id,
                doctor_id=doctor.id,
                facility_id=facility.id,
                procedure_type=ProcedureType.COLONOSCOPY,
                indication="Colorectal cancer screening — family history",
                findings="Single 8mm sessile polyp in sigmoid colon. Normal to caecum.",
                impression="Adenomatous polyp — resected",
                recommendation="Await histopathology. Surveillance colonoscopy in 3 years.",
                image_urls=[],
                procedure_date=today - timedelta(days=14),
            )
        )

    if kwame and hepato:
        db.add(
            LiverRegistry(
                patient_id=kwame.id,
                facility_id=facility.id,
                recorded_by=hepato.id,
                diagnosis=LiverDiagnosis.HEP_B,
                viral_load=1200,
                alt=42,
                ast=38,
                afp=8,
                ultrasound_date=today - timedelta(days=90),
                next_review_date=today - timedelta(days=30),
                risk_flag=LiverRiskFlag.OVERDUE,
            )
        )
        db.add(
            LiverRegistry(
                patient_id=kwame.id,
                facility_id=facility.id,
                recorded_by=hepato.id,
                diagnosis=LiverDiagnosis.HEP_B,
                viral_load=45000,
                alt=86,
                ast=72,
                afp=22,
                ultrasound_date=today - timedelta(days=7),
                next_review_date=today + timedelta(days=90),
                risk_flag=LiverRiskFlag.TREND_ALERT,
            )
        )

    if akosua and hepato:
        db.add(
            LiverRegistry(
                patient_id=akosua.id,
                facility_id=facility.id,
                recorded_by=hepato.id,
                diagnosis=LiverDiagnosis.CIRRHOSIS,
                fibroscan_score=18.5,
                alt=55,
                ast=48,
                afp=12,
                ultrasound_date=today - timedelta(days=21),
                next_review_date=today + timedelta(days=60),
                risk_flag=LiverRiskFlag.NORMAL,
            )
        )

    db.commit()
    logger.info("Demo procedures and liver registry records seeded")


def seed_database():
    db: Session = SessionLocal()
    try:
        facilities = _seed_facilities_if_empty(db)

        if db.query(User).first():
            _seed_specialists_for_users(db)
            _seed_clinical_demo_data(db)
            return

        logger.info("Seeding database with demo facilities and users...")

        if not facilities:
            facilities = db.query(Facility).all()

        for user_data in DEMO_USERS:
            password = os.environ.get(user_data["password_env"])
            if not password:
                logger.warning(
                    f"Skipping {user_data['email']}: env var {user_data['password_env']} not set"
                )
                continue
            user = User(
                name=user_data["name"],
                email=user_data["email"],
                password_hash=get_password_hash(password),
                role=user_data["role"].value,
                department=user_data["department"],
                facility_id=facilities[user_data["facility_index"]].id,
            )
            db.add(user)

        db.commit()
        _seed_specialists_for_users(db)
        _seed_clinical_demo_data(db)
        logger.info("Database seeded successfully")
    except Exception as e:
        logger.error(f"Seed error: {e}")
        db.rollback()
    finally:
        db.close()
