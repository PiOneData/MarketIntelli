from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "MarketIntelli - Solar Market Intelligence"
    VERSION: str = "2.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:marketintelli123@20.40.61.170:9003/marketintelli"
    SYNC_DATABASE_URL: str = "postgresql+psycopg2://postgres:marketintelli123@20.40.61.170:9003/marketintelli"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"


settings = Settings()
