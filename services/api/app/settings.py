from functools import lru_cache
from pathlib import Path
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_AUTH_SECRET = "local-development-secret-change-before-production"
DEFAULT_LOCAL_ADMIN_PASSWORD = "MoveInRangeAdminLocal!"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = f"sqlite:///{(REPO_ROOT / '.local/moveinrange.db').as_posix()}"
    migration_database_url: str | None = None
    database_pool_mode: str = "default"
    database_disable_prepared_statements: bool = False
    database_connect_timeout_seconds: int = 5
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
    moveinrange_env: str | None = None
    serverless_runtime: bool = False
    enable_startup_db_init: bool = True
    cors_origins: str = "http://localhost:3200,http://127.0.0.1:3200,http://localhost:8081,http://127.0.0.1:8081"
    local_admin_email: str = "admin@moveinrange.local"
    local_admin_password: str = DEFAULT_LOCAL_ADMIN_PASSWORD
    enable_development_admin_override: bool = False
    rate_limit_window_seconds: int = 60
    auth_rate_limit: int = 20
    session_revocation_backend: str = "postgres"
    rate_limit_backend: str = "postgres"
    service_version: str = "0.1.0-rc"
    enable_development_reset_preview: bool = True
    product_web_base_url: str = "http://localhost:3210"
    public_app_url: str | None = None
    password_reset_url_base: str | None = None
    email_sender: str = "console"
    email_from: str = "no-reply@moveinrange.local"
    resend_api_key: str | None = None
    resend_from_email: str | None = None
    resend_timeout_seconds: int = 10
    resend_max_attempts: int = 2
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = False
    smtp_timeout_seconds: int = 10
    admin_cookie_secure: bool = False
    enable_e2e_seed: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def deployment_environment(self) -> str:
        return (self.moveinrange_env or self.environment).lower()

    @model_validator(mode="after")
    def validate_security(self):
        deployment = self.deployment_environment in {"production", "staging"}
        if self.session_revocation_backend not in {"postgres", "redis", "memory"}:
            raise ValueError("SESSION_REVOCATION_BACKEND must be postgres, redis, or memory")
        if self.rate_limit_backend not in {"postgres", "memory"}:
            raise ValueError("RATE_LIMIT_BACKEND must be postgres or memory")
        if deployment and (not self.auth_secret or self.auth_secret == DEFAULT_AUTH_SECRET):
            raise ValueError("Deployment requires a non-default AUTH_SECRET")
        if deployment and self.enable_development_admin_override:
            raise ValueError("Development admin override is not allowed in deployment")
        if deployment and "*" in self.cors_origin_list:
            raise ValueError("Deployment CORS origins may not contain wildcard")
        if deployment and self.local_admin_password == DEFAULT_LOCAL_ADMIN_PASSWORD:
            raise ValueError("Deployment requires a non-default LOCAL_ADMIN_PASSWORD")
        if deployment and self.email_sender in {"console", "smtp"}:
            raise ValueError("Deployment requires EMAIL_SENDER=resend")
        if deployment and self.email_sender == "resend" and (not self.resend_api_key or not self.resend_from_email):
            raise ValueError("Resend deployments require RESEND_API_KEY and RESEND_FROM_EMAIL")
        if deployment and self.enable_development_reset_preview:
            raise ValueError("Development reset preview is not allowed in deployment")
        if deployment and self.enable_e2e_seed:
            raise ValueError("E2E seed mode is not allowed in deployment")
        if deployment and not self.admin_cookie_secure:
            raise ValueError("Deployment requires ADMIN_COOKIE_SECURE=true")
        if deployment and self.session_revocation_backend == "memory":
            raise ValueError("Deployment requires durable session revocation")
        if deployment and self.rate_limit_backend == "memory":
            raise ValueError("Deployment requires durable rate limiting")
        if deployment and self.session_revocation_backend == "redis" and not self.redis_url:
            raise ValueError("Redis revocation requires REDIS_URL")
        if deployment and self.smtp_host.lower() in {"localhost", "127.0.0.1", "mailpit"} and self.email_sender == "smtp":
            raise ValueError("Deployment requires a non-local SMTP_HOST")
        if deployment and (self.product_web_base_url.startswith("http://localhost") or self.product_web_base_url.startswith("http://127.0.0.1")):
            raise ValueError("Deployment requires a public PRODUCT_WEB_BASE_URL")
        if deployment and (self.api_base_url.startswith("http://localhost") or self.api_base_url.startswith("http://127.0.0.1") or "api.moveinrange.invalid" in self.api_base_url):
            raise ValueError("Deployment requires a public API_BASE_URL")
        if deployment and "pooler.supabase.com" not in self.database_url:
            raise ValueError("Deployment DATABASE_URL must use the Supabase pooler")
        if "\n" in self.email_from or "\r" in self.email_from:
            raise ValueError("EMAIL_FROM may not contain header control characters")
        if self.resend_from_email and ("\n" in self.resend_from_email or "\r" in self.resend_from_email):
            raise ValueError("RESEND_FROM_EMAIL may not contain header control characters")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
