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

if __name__ == "__main__":
    celery_app.start()