"""
One-off script: update demo user password hashes to match current SEED_*_PASSWORD env vars.
Run from backend/: python scripts/reset_demo_passwords.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Load .env before anything else so SEED_* and DATABASE_URL are available
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

# Import passlib directly to avoid the app.core <-> app.database circular import
from passlib.context import CryptContext
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
def get_password_hash(p: str) -> str:
    return _pwd_context.hash(p)

# Import config first so DATABASE_URL is resolved before database module loads
from app.core.config import settings  # noqa: F401
from app.database import SessionLocal
from app.models.user import User

DEMO_PASSWORDS = {
    "admin@gastro.gh":    os.environ.get("SEED_ADMIN_PASSWORD"),
    "doctor@gastro.gh":   os.environ.get("SEED_DOCTOR_PASSWORD"),
    "hepato@gastro.gh":   os.environ.get("SEED_HEPATO_PASSWORD"),
    "referrer@gastro.gh": os.environ.get("SEED_REFERRER_PASSWORD"),
    "nurse@gastro.gh":    os.environ.get("SEED_NURSE_PASSWORD"),
}

def main():
    missing = [e for e, p in DEMO_PASSWORDS.items() if not p]
    if missing:
        print(f"ERROR: missing env vars for: {missing}")
        sys.exit(1)

    db = SessionLocal()
    try:
        updated = 0
        for email, password in DEMO_PASSWORDS.items():
            user = db.query(User).filter(User.email == email).first()
            if not user:
                print(f"  SKIP  {email} — not found in DB")
                continue
            user.password_hash = get_password_hash(password)
            updated += 1
            print(f"  OK    {email}")
        db.commit()
        print(f"\nDone — {updated} password(s) updated.")
    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
