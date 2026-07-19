from collections.abc import Generator
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import select
from ..settings import get_settings
from .base import Base


def _engine_args(database_url: str) -> dict:
    if database_url.startswith("sqlite"):
        path = database_url.replace("sqlite:///", "", 1)
        if path and path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        return {"connect_args": {"check_same_thread": False}}
    return {"pool_pre_ping": True}


def make_engine(database_url: str | None = None):
    url = database_url or get_settings().database_url
    return create_engine(url, **_engine_args(url))


engine = make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def init_db() -> None:
    from . import models
    from ..auth import hash_password

    Base.metadata.create_all(bind=engine)
    settings = get_settings()
    if settings.environment.lower() == "production":
        return
    with SessionLocal() as db:
        existing = db.scalar(select(models.User).where(models.User.email == settings.local_admin_email))
        if existing is None:
            db.add(models.User(id="local-admin", email=settings.local_admin_email, password_hash=hash_password(settings.local_admin_password), role="super_admin", auth_provider="local"))
        else:
            existing.role = "super_admin"
            existing.password_hash = hash_password(settings.local_admin_password)
            existing.deleted_at = None
        db.commit()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
