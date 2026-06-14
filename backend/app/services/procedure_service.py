from typing import Optional
from sqlalchemy.orm import Session, joinedload
from app.models.procedure import Procedure, ProcedureType
from app.models.user import User
from app.schemas.procedure import ProcedureCreate, ProcedureUpdate, ProcedureTemplates, ProcedureTemplateOption

PROCEDURE_TEMPLATES: dict[ProcedureType, dict[str, list[tuple[str, str]]]] = {
    ProcedureType.GASTROSCOPY: {
        "indications": [
            ("dysphagia", "Dysphagia / Odynophagia"),
            ("ugib", "Upper GI Bleeding"),
            ("dyspepsia", "Dyspepsia refractory to PPI"),
            ("anaemia", "Iron deficiency anaemia"),
            ("nausea", "Persistent nausea/vomiting"),
            ("barretts_surveillance", "Barrett's oesophagus surveillance"),
        ],
        "common_findings": [
            ("oesophagitis", "Oesophagitis (LA Grade A-D)"),
            ("gastritis", "Gastritis / Erosive gastropathy"),
            ("ulcer", "Gastric / Duodenal ulcer"),
            ("varices", "Oesophageal varices"),
            ("barretts", "Barrett's oesophagus"),
            ("normal", "Normal examination"),
        ],
        "impressions": [
            ("peptic_ulcer", "Peptic ulcer disease"),
            ("gord", "Gastro-oesophageal reflux disease"),
            ("portal_hypertension", "Portal hypertensive gastropathy / varices"),
            ("normal", "Normal upper GI endoscopy"),
        ],
        "recommendations": [
            ("ppi", "Continue PPI therapy"),
            ("h_pylori", "Test and treat H. pylori if indicated"),
            ("repeat_egd", "Repeat EGD in 8-12 weeks"),
            ("variceal_band", "Variceal band ligation scheduled"),
        ],
    },
    ProcedureType.COLONOSCOPY: {
        "indications": [
            ("crc_screening", "Colorectal cancer screening"),
            ("rectal_bleeding", "Rectal bleeding"),
            ("altered_bowel", "Altered bowel habit"),
            ("anaemia", "Iron deficiency anaemia"),
            ("ibd_surveillance", "IBD surveillance"),
            ("polyp_surveillance", "Polyp surveillance"),
        ],
        "common_findings": [
            ("polyp", "Colonic polyp(s)"),
            ("diverticulosis", "Diverticulosis"),
            ("colitis", "Colitis"),
            ("mass", "Colonic mass / stricture"),
            ("normal", "Normal to caecum"),
        ],
        "impressions": [
            ("adenomatous_polyp", "Adenomatous polyp — resected"),
            ("diverticular_disease", "Diverticular disease"),
            ("ibd", "Inflammatory bowel disease"),
            ("suspected_malignancy", "Suspected colorectal malignancy"),
            ("normal", "Normal colonoscopy"),
        ],
        "recommendations": [
            ("pathology", "Await histopathology"),
            ("repeat_3yr", "Surveillance colonoscopy in 3 years"),
            ("repeat_1yr", "Surveillance colonoscopy in 1 year"),
            ("refer_surgery", "Refer to colorectal surgery"),
        ],
    },
    ProcedureType.ERCP: {
        "indications": [
            ("choledocholithiasis", "Suspected choledocholithiasis"),
            ("cholangitis", "Acute cholangitis"),
            ("bile_leak", "Post-cholecystectomy bile leak"),
            ("biliary_stricture", "Biliary stricture"),
            ("pancreatitis", "Biliary pancreatitis"),
        ],
        "common_findings": [
            ("cbd_stone", "CBD stone(s)"),
            ("biliary_dilation", "Biliary dilation"),
            ("stricture", "Biliary stricture"),
            ("ampullary_mass", "Ampullary lesion"),
            ("normal", "Normal cholangiogram"),
        ],
        "impressions": [
            ("choledocholithiasis", "Choledocholithiasis — stones extracted"),
            ("cholangitis", "Acute cholangitis — drained"),
            ("biliary_stricture", "Biliary stricture"),
            ("sphincter_stenosis", "Papillary stenosis"),
        ],
        "recommendations": [
            ("stent_exchange", "Stent exchange in 3 months"),
            ("cholecystectomy", "Elective cholecystectomy advised"),
            ("monitor_lfts", "Monitor LFTs in 2 weeks"),
            ("mrcp_followup", "MRCP follow-up if symptoms persist"),
        ],
    },
    ProcedureType.SIGMOIDOSCOPY: {
        "indications": [
            ("rectal_bleeding", "Rectal bleeding"),
            ("tenesmus", "Tenesmus"),
            ("diarrhoea", "Chronic diarrhoea"),
            ("polyp_followup", "Distal polyp follow-up"),
        ],
        "common_findings": [
            ("haemorrhoids", "Haemorrhoids"),
            ("diverticulosis", "Sigmoid diverticulosis"),
            ("polyp", "Sigmoid polyp"),
            ("proctitis", "Proctitis"),
            ("normal", "Normal sigmoidoscopy"),
        ],
        "impressions": [
            ("haemorrhoidal_bleeding", "Haemorrhoidal bleeding"),
            ("diverticular_bleed", "Diverticular bleeding"),
            ("proctitis", "Distal proctitis"),
            ("normal", "Normal flexible sigmoidoscopy"),
        ],
        "recommendations": [
            ("conservative", "Conservative management"),
            ("colonoscopy", "Full colonoscopy if indicated"),
            ("topical_therapy", "Topical mesalazine"),
        ],
    },
}


def get_procedure_templates(procedure_type: ProcedureType) -> ProcedureTemplates:
    data = PROCEDURE_TEMPLATES[procedure_type]

    def to_options(items: list[tuple[str, str]]) -> list[ProcedureTemplateOption]:
        return [ProcedureTemplateOption(value=v, label=l) for v, l in items]

    return ProcedureTemplates(
        procedure_type=procedure_type,
        indications=to_options(data["indications"]),
        common_findings=to_options(data["common_findings"]),
        impressions=to_options(data["impressions"]),
        recommendations=to_options(data["recommendations"]),
    )


def _base_query(db: Session):
    return (
        db.query(Procedure)
        .options(
            joinedload(Procedure.patient),
            joinedload(Procedure.doctor),
            joinedload(Procedure.facility),
        )
        .filter(Procedure.deleted_at.is_(None))
    )


def list_procedures(
    db: Session,
    *,
    patient_id: Optional[int] = None,
    procedure_type: Optional[ProcedureType] = None,
    facility_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Procedure]:
    query = _base_query(db)
    if patient_id:
        query = query.filter(Procedure.patient_id == patient_id)
    if procedure_type:
        query = query.filter(Procedure.procedure_type == procedure_type)
    if facility_id:
        query = query.filter(Procedure.facility_id == facility_id)
    return query.order_by(Procedure.procedure_date.desc()).offset(skip).limit(limit).all()


def get_procedure_by_id(db: Session, procedure_id: int) -> Optional[Procedure]:
    return _base_query(db).filter(Procedure.id == procedure_id).first()


def create_procedure(db: Session, user: User, payload: ProcedureCreate) -> Procedure:
    procedure = Procedure(
        patient_id=payload.patient_id,
        doctor_id=user.id,
        facility_id=payload.facility_id,
        procedure_type=payload.procedure_type,
        procedure_date=payload.procedure_date,
        indication=payload.indication,
        findings=payload.findings,
        impression=payload.impression,
        recommendation=payload.recommendation,
        image_urls=payload.image_urls,
    )
    db.add(procedure)
    db.commit()
    db.refresh(procedure)
    return get_procedure_by_id(db, procedure.id) or procedure


def update_procedure(db: Session, procedure: Procedure, payload: ProcedureUpdate) -> Procedure:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(procedure, field, value)
    db.commit()
    db.refresh(procedure)
    return procedure


def soft_delete_procedure(db: Session, procedure: Procedure) -> Procedure:
    from datetime import datetime, timezone
    procedure.deleted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(procedure)
    return procedure
