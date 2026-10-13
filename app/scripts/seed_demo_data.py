import sys
import os
from datetime import datetime, timezone, timedelta

# Add project root directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import app.models.user
import app.models.asset
import app.models.ticket

from app.database.connection import SessionLocal
from app.models.user import User
from app.models.asset import Asset, AssetAssignment, AssetStatus, AssetType
from app.models.ticket import Ticket, TicketHistory, TicketStatus, TicketPriority, TicketCategory
from app.utils.security import hash_password
from app.services.ticket_service import calculate_sla_deadline

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def seed_database():
    db = SessionLocal()
    print("[INFO] Starting database seeding...")

    # 1. SEED USERS
    users_data = [
        {
            "email": "admin@company.com",
            "full_name": "System Administrator",
            "password": "AdminPassword123",
            "role": "ADMIN"
        },
        {
            "email": "support.sam@company.com",
            "full_name": "Sam Wilson (IT Lead)",
            "password": "SupportPassword123",
            "role": "SUPPORT"
        },
        {
            "email": "support.jane@company.com",
            "full_name": "Jane Miller (IT Support)",
            "password": "SupportPassword123",
            "role": "SUPPORT"
        },
        {
            "email": "john.doe@company.com",
            "full_name": "John Doe (Developer)",
            "password": "EmployeePassword123",
            "role": "EMPLOYEE"
        },
        {
            "email": "sarah.connor@company.com",
            "full_name": "Sarah Connor (QA Engineer)",
            "password": "EmployeePassword123",
            "role": "EMPLOYEE"
        },
        {
            "email": "alex.smith@company.com",
            "full_name": "Alex Smith (Designer)",
            "password": "EmployeePassword123",
            "role": "EMPLOYEE"
        }
    ]

    user_map = {}
    for u in users_data:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if existing:
            existing.full_name = u["full_name"]
            existing.hashed_password = hash_password(u["password"])
            existing.role = u["role"]
            existing.is_active = True
            db.commit()
            db.refresh(existing)
            user_map[u["email"]] = existing
            print(f"  ✓ Updated user: {u['email']} [{u['role']}]")
        else:
            new_u = User(
                email=u["email"],
                full_name=u["full_name"],
                hashed_password=hash_password(u["password"]),
                role=u["role"],
                is_active=True
            )
            db.add(new_u)
            db.commit()
            db.refresh(new_u)
            user_map[u["email"]] = new_u
            print(f"  + Created user: {u['email']} [{u['role']}]")

    john = user_map["john.doe@company.com"]
    sarah = user_map["sarah.connor@company.com"]
    sam = user_map["support.sam@company.com"]
    jane = user_map["support.jane@company.com"]
    alex = user_map["alex.smith@company.com"]

    # 2. SEED ASSETS
    assets_data = [
        # Laptops
        {
            "asset_tag": "LAP-1023",
            "asset_type": AssetType.LAPTOP,
            "brand": "Dell",
            "model": "Latitude 5440",
            "serial_number": "DELL-5440-8821",
            "status": AssetStatus.ASSIGNED,
            "assigned_to_id": john.id
        },
        {
            "asset_tag": "LAP-1024",
            "asset_type": AssetType.LAPTOP,
            "brand": "Apple",
            "model": "MacBook Pro 14 (M3)",
            "serial_number": "MBP-M3-9081",
            "status": AssetStatus.ASSIGNED,
            "assigned_to_id": sarah.id
        },
        {
            "asset_tag": "LAP-1025",
            "asset_type": AssetType.LAPTOP,
            "brand": "Lenovo",
            "model": "ThinkPad T14 Gen 4",
            "serial_number": "LNV-T14-3199",
            "status": AssetStatus.AVAILABLE,
            "assigned_to_id": None
        },
        {
            "asset_tag": "LAP-1026",
            "asset_type": AssetType.LAPTOP,
            "brand": "HP",
            "model": "EliteBook 840 G10",
            "serial_number": "HP-EB840-7712",
            "status": AssetStatus.UNDER_REPAIR,
            "assigned_to_id": None
        },
        # Monitors
        {
            "asset_tag": "MON-2001",
            "asset_type": AssetType.MONITOR,
            "brand": "Dell",
            "model": "UltraSharp 27 4K (U2723QE)",
            "serial_number": "DEL-U27-5501",
            "status": AssetStatus.ASSIGNED,
            "assigned_to_id": john.id
        },
        {
            "asset_tag": "MON-2002",
            "asset_type": AssetType.MONITOR,
            "brand": "LG",
            "model": "UltraFine 32UN650",
            "serial_number": "LG-32UN-1209",
            "status": AssetStatus.AVAILABLE,
            "assigned_to_id": None
        },
        {
            "asset_tag": "MON-2003",
            "asset_type": AssetType.MONITOR,
            "brand": "Samsung",
            "model": "ViewFinity S8 27",
            "serial_number": "SAM-VF27-9932",
            "status": AssetStatus.AVAILABLE,
            "assigned_to_id": None
        },
        # Peripherals
        {
            "asset_tag": "KEY-3001",
            "asset_type": AssetType.KEYBOARD,
            "brand": "Logitech",
            "model": "MX Keys Advanced Wireless",
            "serial_number": "LOG-MXK-4421",
            "status": AssetStatus.ASSIGNED,
            "assigned_to_id": sarah.id
        },
        {
            "asset_tag": "KEY-3002",
            "asset_type": AssetType.KEYBOARD,
            "brand": "Keychron",
            "model": "K2 Wireless Mechanical",
            "serial_number": "KEY-K2-8812",
            "status": AssetStatus.AVAILABLE,
            "assigned_to_id": None
        },
        {
            "asset_tag": "MOU-4001",
            "asset_type": AssetType.MOUSE,
            "brand": "Logitech",
            "model": "MX Master 3S",
            "serial_number": "LOG-MXM3-6621",
            "status": AssetStatus.ASSIGNED,
            "assigned_to_id": john.id
        },
        {
            "asset_tag": "MOU-4002",
            "asset_type": AssetType.MOUSE,
            "brand": "Apple",
            "model": "Magic Mouse",
            "serial_number": "APL-MM-7711",
            "status": AssetStatus.AVAILABLE,
            "assigned_to_id": None
        },
        # Printer
        {
            "asset_tag": "PRN-5001",
            "asset_type": AssetType.PRINTER,
            "brand": "HP",
            "model": "LaserJet Pro MFP 4101fdw",
            "serial_number": "HP-LJM-0012",
            "status": AssetStatus.AVAILABLE,
            "assigned_to_id": None
        }
    ]

    asset_map = {}
    for a in assets_data:
        existing = db.query(Asset).filter(Asset.asset_tag == a["asset_tag"]).first()
        if existing:
            existing.asset_type = a["asset_type"]
            existing.brand = a["brand"]
            existing.model = a["model"]
            existing.serial_number = a["serial_number"]
            existing.status = a["status"]
            existing.assigned_to_id = a["assigned_to_id"]
            db.commit()
            db.refresh(existing)
            asset_map[a["asset_tag"]] = existing
            print(f"  ✓ Updated asset: {a['asset_tag']} - {a['brand']} {a['model']}")
        else:
            new_a = Asset(**a)
            db.add(new_a)
            db.commit()
            db.refresh(new_a)
            asset_map[a["asset_tag"]] = new_a
            print(f"  + Created asset: {a['asset_tag']} - {a['brand']} {a['model']}")

        # Ensure asset assignment history record
        if a["assigned_to_id"]:
            active_assign = db.query(AssetAssignment).filter(
                AssetAssignment.asset_id == asset_map[a["asset_tag"]].id,
                AssetAssignment.returned_at.is_(None)
            ).first()
            if not active_assign:
                new_assignment = AssetAssignment(
                    asset_id=asset_map[a["asset_tag"]].id,
                    user_id=a["assigned_to_id"]
                )
                db.add(new_assignment)
                db.commit()

    # 3. SEED TICKETS
    now = datetime.now(timezone.utc)
    tickets_data = [
        {
            "title": "Laptop screen flickers intermittently when connecting monitor",
            "description": "Whenever I connect the external Dell UltraSharp monitor, the laptop screen starts flickering violently. Tested with multiple HDMI cables.",
            "category": TicketCategory.HARDWARE,
            "priority": TicketPriority.HIGH,
            "status": TicketStatus.IN_PROGRESS,
            "created_by_id": john.id,
            "assigned_to_id": sam.id,
            "asset_id": asset_map["LAP-1023"].id,
            "created_at": now - timedelta(hours=3),
            "sla_deadline": now + timedelta(hours=1),
        },
        {
            "title": "Need VPN profile access for remote testing",
            "description": "Please configure my VPN profile credentials so I can access QA staging servers remotely.",
            "category": TicketCategory.ACCESS,
            "priority": TicketPriority.MEDIUM,
            "status": TicketStatus.ASSIGNED,
            "created_by_id": sarah.id,
            "assigned_to_id": jane.id,
            "asset_id": None,
            "created_at": now - timedelta(hours=5),
            "sla_deadline": now + timedelta(hours=3),
        },
        {
            "title": "Database connection pool timeout on server",
            "description": "Backend API reporting connection pool exhaustion during load tests. Suspect PostgreSQL max connections reached.",
            "category": TicketCategory.NETWORK,
            "priority": TicketPriority.CRITICAL,
            "status": TicketStatus.OPEN,
            "created_by_id": alex.id,
            "assigned_to_id": None,
            "asset_id": None,
            "created_at": now - timedelta(minutes=45),
            "sla_deadline": now + timedelta(minutes=75),
        },
        {
            "title": "Docker Desktop commercial license key renewal",
            "description": "Docker desktop license renewal required after annual team seat audit.",
            "category": TicketCategory.SOFTWARE,
            "priority": TicketPriority.LOW,
            "status": TicketStatus.RESOLVED,
            "created_by_id": john.id,
            "assigned_to_id": sam.id,
            "asset_id": None,
            "created_at": now - timedelta(days=2),
            "sla_deadline": now - timedelta(days=1),
            "resolved_at": now - timedelta(days=1),
            "resolution_notes": "Assigned new enterprise Docker license key and verified daemon active."
        }
    ]

    for t_idx, t in enumerate(tickets_data, start=1):
        existing_t = db.query(Ticket).filter(Ticket.title == t["title"]).first()
        if not existing_t:
            new_ticket = Ticket(
                ticket_number="TEMP",
                title=t["title"],
                description=t["description"],
                category=t["category"],
                priority=t["priority"],
                status=t["status"],
                created_by_id=t["created_by_id"],
                assigned_to_id=t["assigned_to_id"],
                asset_id=t["asset_id"],
                sla_deadline=t["sla_deadline"],
                resolved_at=t.get("resolved_at"),
                resolution_notes=t.get("resolution_notes"),
                created_at=t["created_at"]
            )
            db.add(new_ticket)
            db.flush()
            new_ticket.ticket_number = f"INC-{1000 + new_ticket.id}"
            db.commit()

            # Add initial history log
            hist = TicketHistory(
                ticket_id=new_ticket.id,
                changed_by_id=t["created_by_id"],
                previous_status=None,
                new_status=t["status"].value,
                comment="Seeded ticket record initialized."
            )
            db.add(hist)
            db.commit()
            print(f"  + Created ticket: {new_ticket.ticket_number} - {new_ticket.title[:35]}...")
        else:
            print(f"  [EXISTS] Ticket exists: {existing_t.ticket_number}")

    db.close()
    print("[SUCCESS] Seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
