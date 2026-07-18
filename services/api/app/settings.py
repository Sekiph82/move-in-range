from functools import lru_cache
from pathlib import Path
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_AUTH_SECRET = "local-development-secret-change-before-production"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = f"sqlite:///{(REPO_ROOT / '.local/moveinrange.db').as_posix()}"
    redis_url: str = "redis://localhost:6379/0"
    api_base_url: str = "http://localhost:8200"
    admin_base_url: str = "http://localhost:3200"
    auth_secret: str = DEFAULT_AUTH_SECRET
    token_issuer: str = "moveinrange-api"
    token_audience: str = "moveinrange-mobile"
    access_token_minutes: int = 30
    refresh_token_days: int = 14
    exercise_dataset_path: str = "../exercises-dataset-main/data/exercises.json"
    environment: str = "development"
    cors_origins: str = "http://localhost:3200,http://127.0.0.1:3200,http://localhost:8081,http://127.0.0.1:8081"
    local_admin_email: str = "admin@moveinrange.local"
    local_admin_password: str = "MoveInRangeAdminLocal!"
    enable_development_admin_override: bool = False
    rate_limit_window_seconds: int = 60
    auth_rate_limit: int = 20

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @model_validator(mode="after")
    def validate_security(self):
        production = self.environment.lower() == "production"
        if production and (not self.auth_secret or self.auth_secret == DEFAULT_AUTH_SECRET):
            raise ValueError("Production requires a non-default AUTH_SECRET")
        if production and self.enable_development_admin_override:
            raise ValueError("Development admin override is not allowed in production")
        if production and "*" in self.cors_origin_list:
            raise ValueError("Production CORS origins may not contain wildcard")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
