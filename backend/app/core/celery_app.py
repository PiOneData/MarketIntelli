from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "marketintelli",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks"]  # Add your task modules here
)

# Configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    result_expires=3600,
)

from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    "daily-brief-6am-ist": {
        "task": "tasks.generate_daily_brief",
        "schedule": crontab(hour=0, minute=30),  # 06:00 IST = 00:30 UTC
    },
}

if __name__ == "__main__":
    celery_app.start()