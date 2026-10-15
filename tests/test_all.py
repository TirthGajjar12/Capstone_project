import pytest
from app.services.ticket_service import classify_ticket, calculate_sla_deadline
from app.models.ticket import TicketPriority, TicketCategory
from app.utils.security import hash_password, verify_password

# ==================== 1. SECURITY & AUTH TESTS ====================

def test_password_hashing():
    pwd = "secretpassword123"
    hashed = hash_password(pwd)
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrongpassword", hashed) is False

def test_register_employee_success(client):
    payload = {
        "email": "sarah.connor@company.com",
        "full_name": "Sarah Connor",
        "password": "strongpassword123"
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    assert response.json()["role"] == "EMPLOYEE"

def test_register_support_auto_role(client):
    payload = {
        "email": "support.alex@company.com",
        "full_name": "Alex Support",
        "password": "strongpassword123"
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    assert response.json()["role"] == "SUPPORT"

def test_register_invalid_domain_fails(client):
    payload = {
        "email": "hacker@gmail.com",
        "full_name": "Bad Actor",
        "password": "strongpassword123"
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 422

def test_register_short_password_fails(client):
    payload = {
        "email": "short@company.com",
        "full_name": "Short Pwd",
        "password": "123"
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 422

def test_login_success(client, employee_token):
    assert employee_token is not None

def test_login_invalid_password(client):
    response = client.post("/auth/login", data={"username": "test_emp@company.com", "password": "wrong"})
    assert response.status_code == 401

def test_get_current_user_me(client, employee_token):
    headers = {"Authorization": f"Bearer {employee_token}"}
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == "test_emp@company.com"

# ==================== 2. ASSET MANAGEMENT & RBAC TESTS ====================

def test_create_asset_admin_only(client, admin_token, employee_token):
    payload = {
        "asset_tag": "LAP-9999",
        "asset_type": "Laptop",
        "brand": "Lenovo",
        "model": "ThinkPad T14",
        "serial_number": "SN-LENOVO-1"
    }
    # Employee must be rejected (403)
    emp_res = client.post("/assets/", json=payload, headers={"Authorization": f"Bearer {employee_token}"})
    assert emp_res.status_code == 403

    # Admin must succeed (201)
    admin_res = client.post("/assets/", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_res.status_code == 201
    assert admin_res.json()["status"] == "AVAILABLE"

def test_assign_and_return_asset(client, admin_token):
    # 1. Assign to employee (id=2)
    assign_res = client.post("/assets/1/assign", json={"user_id": 2}, headers={"Authorization": f"Bearer {admin_token}"})
    assert assign_res.status_code == 200
    assert assign_res.json()["status"] == "ASSIGNED"

    # 2. Return asset
    return_res = client.post("/assets/1/return", headers={"Authorization": f"Bearer {admin_token}"})
    assert return_res.status_code == 200
    assert return_res.json()["status"] == "AVAILABLE"

# ==================== 3. AUTO-CLASSIFICATION & SLA TESTS ====================

def test_auto_classification_hardware_high():
    cat, pri = classify_ticket("Laptop screen is broken and won't boot")
    assert cat == TicketCategory.HARDWARE
    assert pri == TicketPriority.HIGH

def test_auto_classification_network():
    cat, pri = classify_ticket("Office wifi and network disconnected")
    assert cat == TicketCategory.NETWORK

def test_auto_classification_access():
    cat, pri = classify_ticket("Please unlock my user login account password")
    assert cat == TicketCategory.ACCESS

def test_auto_classification_critical():
    cat, pri = classify_ticket("Emergency! Production down, server crash")
    assert pri == TicketPriority.CRITICAL

def test_sla_deadline_calculation():
    from datetime import datetime, timezone
    start = datetime.now(timezone.utc)
    critical_deadline = calculate_sla_deadline(TicketPriority.CRITICAL, start_time=start)
    high_deadline = calculate_sla_deadline(TicketPriority.HIGH, start_time=start)

    # Critical = 2 hours, High = 4 hours
    assert (critical_deadline - start).total_seconds() == 2 * 3600
    assert (high_deadline - start).total_seconds() == 4 * 3600

# ==================== 4. TICKET LIFECYCLE TESTS ====================

def test_create_ticket_with_auto_classify(client, employee_token):
    payload = {
        "title": "Broken mouse",
        "description": "My computer mouse is broken",
        "category": None,
        "priority": None
    }
    response = client.post("/tickets/", json=payload, headers={"Authorization": f"Bearer {employee_token}"})
    assert response.status_code == 201
    data = response.json()
    assert data["category"] == "Hardware"
    assert data["status"] == "OPEN"
    assert "INC-" in data["ticket_number"]

def test_update_ticket_status(client, admin_token):
    payload = {"status": "IN_PROGRESS", "comment": "Working on it"}
    res = client.patch("/tickets/1/status", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json()["status"] == "IN_PROGRESS"

def test_resolve_ticket(client, admin_token):
    payload = {"resolution_notes": "Cleaned optical sensor"}
    res = client.post("/tickets/1/resolve", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.json()["status"] == "RESOLVED"

def test_support_ticket_ownership_isolation(client, db_session, admin_token):
    # Register Support User 1 and Support User 2
    client.post("/auth/register", json={
        "email": "support.one@company.com", "full_name": "Support One", "password": "Password123!"
    })
    client.post("/auth/register", json={
        "email": "support.two@company.com", "full_name": "Support Two", "password": "Password123!"
    })
    
    t1 = client.post("/auth/login", data={"username": "support.one@company.com", "password": "Password123!"}).json()["access_token"]
    t2 = client.post("/auth/login", data={"username": "support.two@company.com", "password": "Password123!"}).json()["access_token"]

    u1_id = client.get("/auth/me", headers={"Authorization": f"Bearer {t1}"}).json()["id"]
    u2_id = client.get("/auth/me", headers={"Authorization": f"Bearer {t2}"}).json()["id"]

    # Create a new ticket as employee
    client.post("/auth/register", json={
        "email": "emp.test@company.com", "full_name": "Emp Test", "password": "Password123!"
    })
    emp_tok = client.post("/auth/login", data={"username": "emp.test@company.com", "password": "Password123!"}).json()["access_token"]

    t_res = client.post("/tickets", json={"title": "Test Ownership Issue", "description": "Keyboard broken"}, headers={"Authorization": f"Bearer {emp_tok}"})
    ticket_id = t_res.json()["id"]

    # User 1 assigns ticket to themselves
    assign_res = client.post(f"/tickets/{ticket_id}/assign", json={"assigned_to_id": u1_id}, headers={"Authorization": f"Bearer {t1}"})
    assert assign_res.status_code == 200

    # User 2 tries to update status of User 1's ticket -> 403 Forbidden
    res_forbidden_status = client.patch(f"/tickets/{ticket_id}/status", json={"status": "IN_PROGRESS"}, headers={"Authorization": f"Bearer {t2}"})
    assert res_forbidden_status.status_code == 403

    # User 2 tries to resolve User 1's ticket -> 403 Forbidden
    res_forbidden_resolve = client.post(f"/tickets/{ticket_id}/resolve", json={"resolution_notes": "Fix by user 2"}, headers={"Authorization": f"Bearer {t2}"})
    assert res_forbidden_resolve.status_code == 403

    # User 1 starts work -> 200 OK
    res_allowed_status = client.patch(f"/tickets/{ticket_id}/status", json={"status": "IN_PROGRESS"}, headers={"Authorization": f"Bearer {t1}"})
    assert res_allowed_status.status_code == 200

    # User 1 resolves -> 200 OK
    res_allowed_resolve = client.post(f"/tickets/{ticket_id}/resolve", json={"resolution_notes": "Replaced switch"}, headers={"Authorization": f"Bearer {t1}"})
    assert res_allowed_resolve.status_code == 200

def test_resolve_ticket_with_asset_assignment(client, admin_token):
    # 1. Create an available asset
    asset_res = client.post("/assets", json={
        "asset_type": "Mouse",
        "brand": "Logitech",
        "model": "MX Master 3S",
        "serial_number": "SN-TEST-MOU-999"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert asset_res.status_code == 201
    asset_id = asset_res.json()["id"]

    # 2. Register employee and create a hardware request ticket
    client.post("/auth/register", json={
        "email": "dev.mouse@company.com", "full_name": "Dev Mouse", "password": "Password123!"
    })
    emp_token = client.post("/auth/login", data={"username": "dev.mouse@company.com", "password": "Password123!"}).json()["access_token"]
    ticket_res = client.post("/tickets", json={
        "title": "Hardware Request: Mouse",
        "description": "Need an ergonomic mouse"
    }, headers={"Authorization": f"Bearer {emp_token}"})
    assert ticket_res.status_code == 201
    ticket_id = ticket_res.json()["id"]
    emp_id = ticket_res.json()["created_by_id"]

    # 3. Resolve ticket and assign asset in one step
    resolve_res = client.post(f"/tickets/{ticket_id}/resolve", json={
        "resolution_notes": "Assigned Logitech MX Master 3S",
        "asset_id": asset_id
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert resolve_res.status_code == 200
    ticket_data = resolve_res.json()
    assert ticket_data["status"] == "RESOLVED"
    assert ticket_data["asset_id"] == asset_id

    # 4. Verify asset is now assigned to the employee
    asset_check = client.get(f"/assets/{asset_id}", headers={"Authorization": f"Bearer {admin_token}"}).json()
    assert asset_check["status"] == "ASSIGNED"
    assert asset_check["assigned_to_id"] == emp_id

# ==================== 5. REPORTS & HEALTH TESTS ====================

def test_health_check(client):
    response = client.get("/")
    assert response.status_code == 200

def test_sla_report_endpoint(client, admin_token):
    response = client.get("/reports/sla", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert "sla_compliance_rate_pct" in response.json()

def test_export_tickets_csv(client, admin_token):
    response = client.get("/reports/tickets/export", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv; charset=utf-8"
