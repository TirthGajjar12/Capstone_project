import sys
import os

# Add project root directory to python path (go up 3 levels: seedadmin.py → scripts → app → project root)
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database.connection import SessionLocal
from app.models.user import User
from app.utils.security import hash_password

def seed_admin():
    db = SessionLocal()
    admin_email = "admin@company.com"
    
    # Check if admin already exists
    existing = db.query(User).filter(User.email == admin_email).first()
    if existing:
        print(f"Admin already exists with email: {admin_email}")
        db.close()
        return

    admin_user = User(
        email=admin_email,
        full_name="System Administrator",
        hashed_password=hash_password("adminpassword123"),
        role="ADMIN",
        is_active=True
    )

    db.add(admin_user)
    db.commit()
    print(f"Successfully seeded admin user: {admin_email} / adminpassword123")
    db.close()

if __name__ == "__main__":
    seed_admin()
