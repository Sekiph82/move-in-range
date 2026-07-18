from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = f"sqlite:///{(REPO_ROOT / '.local/moveinrange.db').as_posix()}"
    redis_url: str = "redis://localhost:6379/0"
    api_base_url: str = "http://localhost:8200"
    admin_base_url: str = "http://localhost:3200"
    auth_secret: str = "local-development-secret-change-before-production"
    access_token_minutes: int = 30
    refresh_token_days: int = 14
    exercise_dataset_path: str = "../exercises-dataset-main/data/exercises.json"


@lru_cache
def get_settings() -> Settings:
    return Settings()
