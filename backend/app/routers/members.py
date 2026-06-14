from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models.membership import Membership, MembershipStatus
from app.models.user import User
from app.core.security import get_current_user
from app.core.rbac import require_permission
from app.core.audit import log_audit
from app.schemas.membership import (
    MembershipCreate,
    MembershipUpdate,
    MembershipOut,
    CPDUpdate,
    GuidelineOut,
    ConferenceOut,
)

router = APIRouter(prefix="/members", tags=["Association Member Portal"])


# ── Static data (production would pull from DB tables) ────────────────────────

_GUIDELINES: List[dict] = [
    {
        "id": 1,
        "title": "Management of Hepatitis B in Sub-Saharan Africa",
        "category": "Hepatology",
        "published_date": "2024-01-15",
        "file_url": "/guidelines/hepatitis_b_ssa_2024.pdf",
        "description": "Updated GHGA guidelines for HBV management including tenofovir-based therapy.",
    },
    {
        "id": 2,
        "title": "Colonoscopy Quality Indicators — Ghana Standard",
        "category": "Endoscopy",
        "published_date": "2024-03-01",
        "file_url": "/guidelines/colonoscopy_quality_2024.pdf",
        "description": "Adenoma detection rates, caecal intubation benchmarks, and withdrawal time standards.",
    },
    {
        "id": 3,
        "title": "Upper GI Bleeding: Emergency Protocol",
        "category": "Emergency GI",
        "published_date": "2023-11-20",
        "file_url": "/guidelines/ugi_bleeding_protocol_2023.pdf",
        "description": "Rockford score-based triage, early endoscopy criteria, and haemostasis techniques.",
    },
    {
        "id": 4,
        "title": "Colorectal Cancer Screening Recommendations",
        "category": "Oncology",
        "published_date": "2024-05-10",
        "file_url": "/guidelines/crc_screening_2024.pdf",
        "description": "GHGA endorsed CRC screening programme for average-risk adults ≥45 years.",
    },
    {
        "id": 5,
        "title": "Liver Cirrhosis & Portal Hypertension Management",
        "category": "Hepatology",
        "published_date": "2023-09-05",
        "file_url": "/guidelines/cirrhosis_portal_htn_2023.pdf",
        "description": "Variceal screening intervals, beta-blocker therapy, and ascites management.",
    },
]

_CONFERENCES: List[dict] = [
    {
        "id": 1,
        "title": "Ghana Gastroenterology & Hepatology Annual Congress",
        "location": "Accra International Conference Centre, Accra",
        "event_date": "2025-09-18",
        "deadline": "2025-07-31",
        "description": "The flagship annual meeting of the Ghana Gastroenterology Association covering all GI subspecialties.",
        "registration_url": "https://ghga.org.gh/congress2025",
        "tags": ["Annual Meeting", "CME", "Workshops"],
    },
    {
        "id": 2,
        "title": "West African Liver Disease Summit",
        "location": "Kempinski Hotel Gold Coast, Accra",
        "event_date": "2025-11-06",
        "deadline": "2025-09-15",
        "description": "Regional conference on viral hepatitis, HCC surveillance, and liver transplantation outcomes in West Africa.",
        "registration_url": "https://walds.org/summit2025",
        "tags": ["Hepatology", "HCC", "Viral Hepatitis"],
    },
    {
        "id": 3,
        "title": "Endoscopy Masterclass — Advanced Techniques",
        "location": "Korle Bu Teaching Hospital, Accra",
        "event_date": "2025-07-12",
        "deadline": "2025-06-20",
        "description": "Hands-on workshop covering EMR, ESD, ERCP, and EUS for intermediate-level endoscopists.",
        "registration_url": "https://ghga.org.gh/endoscopy-masterclass",
        "tags": ["Workshop", "Endoscopy", "Hands-on"],
    },
    {
        "id": 4,
        "title": "Pan-African GI Oncology Symposium",
        "location": "Virtual (Pan-African)",
        "event_date": "2025-08-22",
        "deadline": None,
        "description": "Multi-country virtual symposium on GI cancer epidemiology, early detection, and multidisciplinary management.",
        "registration_url": "https://pagio.africa/symposium2025",
        "tags": ["Oncology", "Virtual", "CRC", "HCC"],
    },
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _enrich(m: Membership) -> MembershipOut:
    return MembershipOut(
        id=m.id,
        user_id=m.user_id,
        status=m.status,
        renewal_date=m.renewal_date,
        cpd_points_accumulated=m.cpd_points_accumulated,
        created_at=m.created_at,
        updated_at=m.updated_at,
        member_name=m.member.name if m.member else None,
        member_email=m.member.email if m.member else None,
        member_role=m.member.role.value if m.member else None,
    )


def _get_or_create_membership(db: Session, user: User) -> Membership:
    m = db.query(Membership).filter(Membership.user_id == user.id).first()
    if not m:
        m = Membership(user_id=user.id, status=MembershipStatus.PENDING, cpd_points_accumulated=0)
        db.add(m)
        db.commit()
        db.refresh(m)
    return m


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/me", response_model=MembershipOut)
def get_my_membership(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the current user's membership record, auto-creating if absent."""
    from sqlalchemy.orm import joinedload
    m = (
        db.query(Membership)
        .options(joinedload(Membership.member))
        .filter(Membership.user_id == current_user.id)
        .first()
    )
    if not m:
        m = Membership(user_id=current_user.id, status=MembershipStatus.PENDING, cpd_points_accumulated=0)
        db.add(m)
        db.commit()
        db.refresh(m)
        m = (
            db.query(Membership)
            .options(joinedload(Membership.member))
            .filter(Membership.user_id == current_user.id)
            .first()
        )
    return _enrich(m)


@router.post("/me/cpd", response_model=MembershipOut)
def add_cpd_points(
    payload: CPDUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Self-service CPD point logging (e.g., after attending a conference)."""
    from sqlalchemy.orm import joinedload
    m = _get_or_create_membership(db, current_user)
    m.cpd_points_accumulated = float(m.cpd_points_accumulated or 0) + float(payload.points_to_add)
    db.commit()
    log_audit(
        db,
        user_id=current_user.id,
        action="CPD_UPDATE",
        resource_type="membership",
        resource_id=m.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"points_added": float(payload.points_to_add)},
    )
    m = (
        db.query(Membership)
        .options(joinedload(Membership.member))
        .filter(Membership.id == m.id)
        .first()
    )
    return _enrich(m)


@router.get("/", response_model=List[MembershipOut])
def list_members(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("members:admin")),
):
    """Admin: list all members."""
    from sqlalchemy.orm import joinedload
    rows = (
        db.query(Membership)
        .options(joinedload(Membership.member))
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_enrich(m) for m in rows]


@router.put("/{member_id}", response_model=MembershipOut)
def update_membership(
    member_id: int,
    payload: MembershipUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("members:admin")),
):
    """Admin: update status, renewal date, or CPD balance."""
    from sqlalchemy.orm import joinedload
    m = db.query(Membership).filter(Membership.id == member_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Membership not found")
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(m, field, val)
    db.commit()
    log_audit(
        db,
        user_id=current_user.id,
        action="UPDATE",
        resource_type="membership",
        resource_id=member_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details=payload.model_dump(exclude_unset=True),
    )

    # Fire renewal alert when admin sets status to EXPIRED or renewal_date changes
    updated_fields = payload.model_dump(exclude_unset=True)
    if "renewal_date" in updated_fields or updated_fields.get("status") == MembershipStatus.EXPIRED:
        from app.services.notifications import send_membership_renewal_alert
        send_membership_renewal_alert.delay(m.user_id)

    m = (
        db.query(Membership)
        .options(joinedload(Membership.member))
        .filter(Membership.id == member_id)
        .first()
    )
    return _enrich(m)


@router.get("/guidelines", response_model=List[GuidelineOut])
def list_guidelines(
    current_user: User = Depends(get_current_user),
):
    return [GuidelineOut(**g) for g in _GUIDELINES]


@router.get("/conferences", response_model=List[ConferenceOut])
def list_conferences(
    current_user: User = Depends(get_current_user),
):
    return [ConferenceOut(**c) for c in _CONFERENCES]
