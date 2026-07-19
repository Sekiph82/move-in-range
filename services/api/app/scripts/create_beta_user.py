import argparse
from getpass import getpass
import hashlib

from ..auth import hash_password
from ..db.models import AuditLog, User
from ..db.session import SessionLocal
from ..settings import get_settings


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a staging beta user without placing the password in shell history.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--prompt-password", action="store_true")
    parser.add_argument("--role", default="user")
    args = parser.parse_args()

    settings = get_settings()
    if settings.deployment_environment == "production":
        raise SystemExit("Refusing to create beta users in production.")
    if not args.prompt_password:
        raise SystemExit("Use --prompt-password so the password is not stored in command history.")
    password = getpass("Password: ")
    confirm = getpass("Confirm password: ")
    if password != confirm:
        raise SystemExit("Passwords do not match.")
    if len(password) < 10:
        raise SystemExit("Password must be at least 10 characters.")

    email = args.email.strip().lower()
    user_id = "beta_" + hashlib.sha256(email.encode()).hexdigest()[:24]
    with SessionLocal() as db:
        existing = db.query(User).filter(User.email == email).one_or_none()
        if existing:
            existing.password_hash = hash_password(password)
            existing.deleted_at = None
            existing.role = args.role
            target_id = existing.id
            action = "beta_user.updated"
        else:
            db.add(User(id=user_id, email=email, password_hash=hash_password(password), auth_provider="local", role=args.role))
            target_id = user_id
            action = "beta_user.created"
        db.add(AuditLog(actor_id="system", action=action, target_type="user", target_id=target_id, redacted_payload={"source": "interactive_script"}))
        db.commit()
    print(f"Beta user ready: {email}")


if __name__ == "__main__":
    main()
