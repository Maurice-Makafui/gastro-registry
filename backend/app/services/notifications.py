"""
Notification tasks – Celery + SMTP.
WhatsApp hook is stubbed and ready for a provider SDK (e.g. Twilio / Meta API).
"""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List

from celery import Task
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.core.config import settings
from app.database import SessionLocal

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_db() -> Session:
    return SessionLocal()


def _send_email(to: str, subject: str, body: str) -> None:
    """Send a plain-text email via SMTP.  Logs a warning if SMTP is not configured."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured – skipping email to %s | subject: %s", to, subject)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM, [to], msg.as_string())

    logger.info("Email sent → %s | %s", to, subject)


def _send_whatsapp(phone: str, message: str) -> None:
    """
    WhatsApp integration hook.
    Replace the body of this function with a Twilio / Meta Cloud API call.

    Example (Twilio):
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(
            from_=f"whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}",
            to=f"whatsapp:{phone}",
            body=message,
        )
    """
    logger.info("[WhatsApp hook] → %s | %s", phone, message)


# ---------------------------------------------------------------------------
# Celery tasks
# ---------------------------------------------------------------------------

class _BaseTask(Task):
    abstract = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error("Task %s[%s] failed: %s", self.name, task_id, exc, exc_info=einfo)


@celery_app.task(
    bind=True,
    base=_BaseTask,
    name="app.services.notifications.send_referral_notification",
    max_retries=3,
    default_retry_delay=60,
)
def send_referral_notification(self, referral_id: int, doctor_id: int) -> dict:
    """Notify the assigned doctor about a new referral."""
    db = _get_db()
    try:
        from app.models.referral import Referral
        from app.models.user import User

        referral = db.query(Referral).filter(Referral.id == referral_id).first()
        doctor = db.query(User).filter(User.id == doctor_id).first()

        if not referral or not doctor:
            logger.warning("send_referral_notification: referral=%s or doctor=%s not found", referral_id, doctor_id)
            return {"status": "skipped", "reason": "record_not_found"}

        subject = f"[GastroRef] New Referral #{referral_id} – {referral.risk_level.value} Risk"
        body = (
            f"Dear Dr. {doctor.name},\n\n"
            f"A new referral (ID #{referral_id}) has been assigned to you.\n"
            f"Risk Level : {referral.risk_level.value}\n"
            f"Chief Complaint : {referral.chief_complaint or 'N/A'}\n"
            f"Urgency : {referral.urgency or 'N/A'}\n\n"
            f"Please log in to review: http://localhost:3000/doctor/referral/{referral_id}\n\n"
            "GastroRef Ghana"
        )

        _send_email(doctor.email, subject, body)
        if doctor.phone:
            _send_whatsapp(doctor.phone, f"New referral #{referral_id} ({referral.risk_level.value} risk) assigned to you.")

        logger.info("Referral notification sent: referral=%s doctor=%s", referral_id, doctor_id)
        return {"status": "sent", "referral_id": referral_id, "doctor_id": doctor_id}

    except Exception as exc:
        logger.error("send_referral_notification error: %s", exc)
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task(
    bind=True,
    base=_BaseTask,
    name="app.services.notifications.send_mdt_alert",
    max_retries=3,
    default_retry_delay=60,
)
def send_mdt_alert(self, case_id: int, user_ids: List[int]) -> dict:
    """Alert panel members about a new or updated MDT case."""
    db = _get_db()
    try:
        from app.models.mdt import MDTCase
        from app.models.user import User

        case = db.query(MDTCase).filter(MDTCase.id == case_id).first()
        if not case:
            logger.warning("send_mdt_alert: case %s not found", case_id)
            return {"status": "skipped", "reason": "case_not_found"}

        users = db.query(User).filter(User.id.in_(user_ids)).all()
        subject = f"[GastroRef] MDT Case #{case_id} – Action Required"
        body_template = (
            "Dear {name},\n\n"
            f"You have been added to MDT Case #{case_id}.\n"
            f"Status  : {case.discussion_status.value}\n"
            f"Summary : {case.history_summary[:200]}...\n\n"
            f"Review here: http://localhost:3000/mdt/{case_id}\n\n"
            "GastroRef Ghana"
        )

        notified: List[int] = []
        for user in users:
            _send_email(user.email, subject, body_template.format(name=user.name))
            if user.phone:
                _send_whatsapp(user.phone, f"MDT Case #{case_id} requires your input.")
            notified.append(user.id)

        logger.info("MDT alert sent: case=%s users=%s", case_id, notified)
        return {"status": "sent", "case_id": case_id, "notified_users": notified}

    except Exception as exc:
        logger.error("send_mdt_alert error: %s", exc)
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task(
    bind=True,
    base=_BaseTask,
    name="app.services.notifications.send_follow_up_reminder",
    max_retries=3,
    default_retry_delay=120,
)
def send_follow_up_reminder(self, patient_id: int, registry_type: str) -> dict:
    """Remind the care team of an overdue follow-up for a registered patient."""
    db = _get_db()
    try:
        from app.models.patient import Patient

        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            logger.warning("send_follow_up_reminder: patient %s not found", patient_id)
            return {"status": "skipped", "reason": "patient_not_found"}

        subject = f"[GastroRef] Follow-up Reminder – {patient.name} ({registry_type})"
        body = (
            f"This is an automated reminder.\n\n"
            f"Patient  : {patient.name}\n"
            f"Registry : {registry_type}\n\n"
            f"A follow-up is due or overdue. Please review:\n"
            f"http://localhost:3000/patient/{patient_id}\n\n"
            "GastroRef Ghana"
        )

        # Notify all doctors associated with the patient's last referral
        from app.models.referral import Referral
        last_referral = (
            db.query(Referral)
            .filter(Referral.patient_id == patient_id, Referral.assigned_doctor_id.isnot(None))
            .order_by(Referral.created_at.desc())
            .first()
        )

        if last_referral and last_referral.assigned_doctor:
            doctor = last_referral.assigned_doctor
            _send_email(doctor.email, subject, body)
            if doctor.phone:
                _send_whatsapp(doctor.phone, f"Follow-up reminder: {patient.name} ({registry_type}).")

        logger.info("Follow-up reminder sent: patient=%s registry=%s", patient_id, registry_type)
        return {"status": "sent", "patient_id": patient_id, "registry_type": registry_type}

    except Exception as exc:
        logger.error("send_follow_up_reminder error: %s", exc)
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task(
    bind=True,
    base=_BaseTask,
    name="app.services.notifications.send_membership_renewal_alert",
    max_retries=3,
    default_retry_delay=300,
)
def send_membership_renewal_alert(self, user_id: int) -> dict:
    """Alert a member that their membership is expiring soon."""
    db = _get_db()
    try:
        from app.models.user import User
        from app.models.membership import Membership

        user = db.query(User).filter(User.id == user_id).first()
        membership = db.query(Membership).filter(Membership.user_id == user_id).first()

        if not user or not membership:
            logger.warning("send_membership_renewal_alert: user=%s or membership not found", user_id)
            return {"status": "skipped", "reason": "record_not_found"}

        renewal_date = membership.renewal_date.strftime("%d %B %Y") if membership.renewal_date else "N/A"
        subject = "[GastroRef] Your Membership is Due for Renewal"
        body = (
            f"Dear {user.name},\n\n"
            f"Your GastroRef Ghana membership is due for renewal on {renewal_date}.\n"
            f"Current status : {membership.status.value}\n"
            f"CPD Points     : {membership.cpd_points_accumulated}\n\n"
            f"Renew here: http://localhost:3000/member\n\n"
            "GastroRef Ghana"
        )

        _send_email(user.email, subject, body)
        if user.phone:
            _send_whatsapp(user.phone, f"Your GastroRef membership renews on {renewal_date}. Visit /member to renew.")

        logger.info("Membership renewal alert sent: user=%s", user_id)
        return {"status": "sent", "user_id": user_id}

    except Exception as exc:
        logger.error("send_membership_renewal_alert error: %s", exc)
        raise self.retry(exc=exc)
    finally:
        db.close()
