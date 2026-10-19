import sys
import os
import argparse

# Add project root directory to python path (go up 3 levels: seedadmin.py → scripts → app → project root)
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database.connection import SessionLocal
from app.models.user import User
from app.utils.security import hash_password

DEMO_USERS = {
    "admin@company.com": ("System Administrator", "ADMIN", "AdminPassword123"),
    "support.sam@company.com": ("Sam Wilson (IT Lead)", "SUPPORT", "SupportPassword123"),
    "support.jane@company.com": ("Jane Miller (IT Support)", "SUPPORT", "SupportPassword123"),
    "support.anshuman@company.com": ("Anshuman (IT Support)", "SUPPORT", "SupportPassword123"),
    "john.doe@company.com": ("John Doe (Developer)", "EMPLOYEE", "EmployeePassword123"),
    "sarah.connor@company.com": ("Sarah Connor (QA Engineer)", "EMPLOYEE", "EmployeePassword123"),
    "alex.smith@company.com": ("Alex Smith (Designer)", "EMPLOYEE", "EmployeePassword123"),
}

def seed_admin(reset: bool = False, reset_all: bool = False, custom_password: str = "AdminPassword123"):
    db = SessionLocal()
    try:
        if reset_all:
            print("[INFO] Resetting all demo accounts...")
            for email, (full_name, role, default_pwd) in DEMO_USERS.items():
                user = db.query(User).filter(User.email == email).first()
                if user:
                    user.hashed_password = hash_password(default_pwd)
                    user.is_active = True
                    print(f"  ✓ Reset password for {email} -> {default_pwd}")
                else:
                    new_u = User(
                        email=email,
                        full_name=full_name,
                        hashed_password=hash_password(default_pwd),
                        role=role,
                        is_active=True
                    )
                    db.add(new_u)
                    print(f"  + Created {email} -> {default_pwd}")
            db.commit()
            print("[SUCCESS] All demo accounts have been restored.")
            return

        admin_email = "admin@company.com"
        existing = db.query(User).filter(User.email == admin_email).first()

        if existing:
            if reset:
                existing.hashed_password = hash_password(custom_password)
                existing.is_active = True
                db.commit()
                print(f"[SUCCESS] Admin password for {admin_email} has been reset to '{custom_password}'")
            else:
                print(f"[INFO] Admin user already exists with email: {admin_email}")
                print(f"       Run 'python app/scripts/seedadmin.py --reset' to restore the default password.")
            return

        admin_user = User(
            email=admin_email,
            full_name="System Administrator",
            hashed_password=hash_password(custom_password),
            role="ADMIN",
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        print(f"[SUCCESS] Created admin user: {admin_email} / {custom_password}")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed or reset ITSM administrator and demo accounts.")
    parser.add_argument("--reset", action="store_true", help="Force-reset admin@company.com password to default (AdminPassword123)")
    parser.add_argument("--all", action="store_true", help="Reset all standard demo user passwords")
    parser.add_argument("--password", type=str, default="AdminPassword123", help="Custom password to set for admin (default: AdminPassword123)")
    args = parser.parse_args()

    seed_admin(reset=args.reset, reset_all=args.all, custom_password=args.password)

