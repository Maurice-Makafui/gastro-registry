import sys
sys.stdout.reconfigure(line_buffering=True)

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.facility import Facility
from app.core.security import get_password_hash
from app.seed import seed_database

# Run seed if empty
seed_database()

db = SessionLocal()

fac = db.query(Facility).first()
new_users = [
    ("Super Admin",    "superadmin@gastro.gh",    "super123",    UserRole.SUPER_ADMIN),
    ("Platform Admin", "platformadmin@gastro.gh", "platform123", UserRole.PLATFORM_ADMIN),
]
for name, email, pwd, role in new_users:
    if not db.query(User).filter(User.email == email).first():
        db.add(User(
            name=name, email=email,
            password_hash=get_password_hash(pwd),
            role=role, is_active=True,
            facility_id=fac.id if fac else None,
        ))
        print(f"Created: {email} / {role.value}")
    else:
        print(f"Exists:  {email}")

db.commit()

print("\n=== ALL USERS ===")
for u in db.query(User).order_by(User.id).all():
    print(f"  {u.email:40s} {str(u.role.value):20s} active={u.is_active}")

db.close()
