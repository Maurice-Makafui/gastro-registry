from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "gastro_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.services.notifications"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Africa/Accra",
    enable_utc=True,
    task_default_queue="notifications",
    task_routes={
        "app.services.notifications.*": {"queue": "notifications"},
    },
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
