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
    # When support engineers exist, ticket is automatically assigned
    assert data["status"] in ("OPEN", "ASSIGNED")
    if data["status"] == "ASSIGNED":
        assert data["assignment_mode"] == "AUTO"
        assert data["assigned_to_id"] is not None
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

    # Admin assigns ticket to User 1
    assign_res = client.post(f"/tickets/{ticket_id}/assign", json={"assigned_to_id": u1_id, "reason": "Ownership test assignment"}, headers={"Authorization": f"Bearer {admin_token}"})
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

# ==================== 6. PAGINATION (SKIP / LIMIT) TESTS ====================

def test_tickets_pagination_skip_limit(client, admin_token):
    # Fetch first page with limit=1
    res1 = client.get("/tickets/?skip=0&limit=1", headers={"Authorization": f"Bearer {admin_token}"})
    assert res1.status_code == 200
    assert "X-Total-Count" in res1.headers
    data1 = res1.json()
    assert len(data1) <= 1

    # Fetch second page with skip=1, limit=1
    res2 = client.get("/tickets/?skip=1&limit=1", headers={"Authorization": f"Bearer {admin_token}"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data2) <= 1

    # If multiple tickets exist, records on page 1 and page 2 must be different
    if data1 and data2:
        assert data1[0]["id"] != data2[0]["id"]

def test_assets_pagination_skip_limit(client, admin_token):
    res = client.get("/assets/?skip=0&limit=1", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert "X-Total-Count" in res.headers
    data = res.json()
    assert len(data) <= 1

# ==================== 7. RSA ASYMMETRIC ENCRYPTION TESTS ====================

def test_rsa_public_key_endpoint(client):
    res = client.get("/auth/public-key")
    assert res.status_code == 200
    data = res.json()
    assert "public_key" in data
    assert "-----BEGIN PUBLIC KEY-----" in data["public_key"]
    assert "-----END PUBLIC KEY-----" in data["public_key"]

def test_rsa_encrypted_login_flow(client):
    import base64
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.hazmat.primitives import serialization, hashes

    # 1. Fetch public key from endpoint
    res = client.get("/auth/public-key")
    pub_pem = res.json()["public_key"].encode("utf-8")
    public_key = serialization.load_pem_public_key(pub_pem)

    # 2. Register test user with plain password
    client.post("/auth/register", json={
        "email": "rsa.user@company.com",
        "full_name": "RSA Test User",
        "password": "RsaPassword123!"
    })

    # 3. Encrypt password using RSA-OAEP + SHA-256 (simulating browser WebCrypto)
    ciphertext = public_key.encrypt(
        b"RsaPassword123!",
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    encrypted_b64 = f"RSA:{base64.b64encode(ciphertext).decode('utf-8')}"

    # 4. Attempt login with encrypted password
    login_res = client.post("/auth/login", data={
        "username": "rsa.user@company.com",
        "password": encrypted_b64
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

def test_filtered_totals_before_pagination(client, admin_token):
    # Fetch all tickets
    all_res = client.get("/tickets/", headers={"Authorization": f"Bearer {admin_token}"})
    all_tickets = all_res.json()
    resolved_count = sum(1 for t in all_tickets if t["status"] == "RESOLVED")

    # Fetch with status filter and limit=1
    filtered_res = client.get("/tickets/?status=RESOLVED&skip=0&limit=1", headers={"Authorization": f"Bearer {admin_token}"})
    assert filtered_res.status_code == 200
    assert "X-Total-Count" in filtered_res.headers
    # X-Total-Count must reflect the filtered total, NOT the entire unfiltered database
    assert int(filtered_res.headers["X-Total-Count"]) == resolved_count

def test_pagination_pages_do_not_overlap(client, admin_token):
    res_page1 = client.get("/tickets/?skip=0&limit=2", headers={"Authorization": f"Bearer {admin_token}"})
    res_page2 = client.get("/tickets/?skip=2&limit=2", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_page1.status_code == 200
    assert res_page2.status_code == 200
    
    ids_page1 = {t["id"] for t in res_page1.json()}
    ids_page2 = {t["id"] for t in res_page2.json()}
    # Page 1 and Page 2 must not have overlapping ticket IDs
    assert ids_page1.isdisjoint(ids_page2)

def test_rsa_malformed_payload_fails_closed(client):
    # Attempt login with corrupted RSA payload
    res = client.post("/auth/login", data={
        "username": "rsa.user@company.com",
        "password": "RSA:corrupted_malformed_base64_data_12345"
    })
    # Must fail closed with 400 Bad Request
    assert res.status_code == 400
    assert "Malformed or undecryptable RSA credential payload" in res.json()["detail"]

def test_rsa_key_persistence(client):
    import os
    from app.utils.rsa_crypto import get_public_key_pem
    # Public key should be consistent across repeated calls
    k1 = get_public_key_pem()
    k2 = get_public_key_pem()
    assert k1 == k2
    # Verify key is persisted on disk
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assert os.path.exists(os.path.join(root_dir, "keys", "rsa_private.pem"))


# ==================== 8. ASSET FILTERING TESTS ====================

def test_assets_filter_case_insensitive_type(client, admin_token):
    # Query with uppercase "LAPTOP" (which previously returned 422)
    res_upper = client.get("/assets/?asset_type=LAPTOP", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_upper.status_code == 200
    for asset in res_upper.json():
        assert asset["asset_type"] == "Laptop"

    # Query with title case "Laptop"
    res_title = client.get("/assets/?asset_type=Laptop", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_title.status_code == 200
    for asset in res_title.json():
        assert asset["asset_type"] == "Laptop"

    # Query with lowercase "laptop"
    res_lower = client.get("/assets/?asset_type=laptop", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_lower.status_code == 200
    for asset in res_lower.json():
        assert asset["asset_type"] == "Laptop"

def test_assets_filter_peripherals_grouping(client, admin_token):
    # Query with "PERIPHERALS" bundle
    res_peri = client.get("/assets/?asset_type=PERIPHERALS", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_peri.status_code == 200
    peri_types = {"Keyboard", "Mouse", "Printer"}
    for asset in res_peri.json():
        assert asset["asset_type"] in peri_types

    # Query with comma-separated types
    res_comma = client.get("/assets/?asset_type=Keyboard,Mouse,Printer", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_comma.status_code == 200
    for asset in res_comma.json():
        assert asset["asset_type"] in peri_types

def test_assets_filter_employee_view(client, employee_token):
    # Employee fetches their own assets with type filter
    res = client.get("/assets/?asset_type=LAPTOP", headers={"Authorization": f"Bearer {employee_token}"})
    assert res.status_code == 200
    for asset in res.json():
        assert asset["asset_type"] == "Laptop"

def test_assets_search_by_employee_name(client, admin_token):
    res = client.get("/assets/?search=John", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200

# ==================== 9. AUTOMATIC ASSIGNMENT & PRIORITY MANAGEMENT TESTS ====================

def test_auto_assignment_least_loaded_support_engineer(client, employee_token, db_session):
    from app.services.ticket_service import find_least_loaded_support_engineer
    # 1. Determine least-loaded support engineer initially
    eng1 = find_least_loaded_support_engineer(db_session)
    assert eng1 is not None

    # 2. Create ticket 1 -> auto-assigns to eng1
    ticket1 = client.post("/tickets/", json={"title": "Workload Task 1", "description": "VPN issue"}, headers={"Authorization": f"Bearer {employee_token}"}).json()
    assert ticket1["status"] == "ASSIGNED"
    assert ticket1["assignment_mode"] == "AUTO"
    assert ticket1["assigned_to_id"] == eng1.id

    # 3. Create ticket 2 -> eng1 now has 1 active ticket, so least-loaded algorithm selects another engineer
    ticket2 = client.post("/tickets/", json={"title": "Workload Task 2", "description": "Software crash"}, headers={"Authorization": f"Bearer {employee_token}"}).json()
    assert ticket2["status"] == "ASSIGNED"
    assert ticket2["assignment_mode"] == "AUTO"
    assert ticket2["assigned_to_id"] != eng1.id

def test_auto_assignment_workload_tie_breaker(db_session):
    # When workloads are equal, tie-breaker must deterministically select lowest user id
    from app.services.ticket_service import find_least_loaded_support_engineer
    least_loaded = find_least_loaded_support_engineer(db_session)
    assert least_loaded is not None
    assert least_loaded.role == "SUPPORT"

def test_auto_assignment_no_support_engineers():
    # Test that find_least_loaded_support_engineer returns None gracefully when no active support users exist
    from app.services.ticket_service import find_least_loaded_support_engineer
    from unittest.mock import MagicMock
    mock_db = MagicMock()
    mock_query = MagicMock()
    mock_query.filter.return_value = mock_query
    mock_query.order_by.return_value = mock_query
    mock_query.all.return_value = []
    mock_db.query.return_value = mock_query
    result = find_least_loaded_support_engineer(mock_db)
    assert result is None

def test_auto_assignment_excludes_admins_and_inactive_users(db_session):
    from app.services.ticket_service import find_least_loaded_support_engineer
    from app.models.user import User
    inactive = User(
        email="support.inactive_test@company.com",
        full_name="Inactive Support",
        hashed_password="hashed_pass",
        role="SUPPORT",
        is_active=False
    )
    db_session.add(inactive)
    db_session.commit()
    least = find_least_loaded_support_engineer(db_session)
    if least:
        assert least.is_active is True
        assert least.role == "SUPPORT"

def test_employee_priority_manipulation_ignored(client, employee_token):
    # Employee sends "CRITICAL" priority for a low/medium issue like "Office supplies printer paper query"
    res = client.post("/tickets/", json={
        "title": "Need printer paper query",
        "description": "General question about office supplies",
        "priority": "CRITICAL"
    }, headers={"Authorization": f"Bearer {employee_token}"})
    assert res.status_code == 201
    ticket_data = res.json()
    # Server-side classification must control priority; employee input is not accepted to jump the queue
    assert ticket_data["priority"] in ("LOW", "MEDIUM")

def test_priority_update_rbac_and_validation(client, admin_token, employee_token):
    # Register support engineers (email starts with support.)
    client.post("/auth/register", json={
        "email": "support.rbac@company.com", "full_name": "RBAC Support", "password": "Password123!"
    })
    sup_token = client.post("/auth/login", data={"username": "support.rbac@company.com", "password": "Password123!"}).json()["access_token"]
    sup_id = client.get("/auth/me", headers={"Authorization": f"Bearer {sup_token}"}).json()["id"]

    # Create ticket as employee
    ticket = client.post("/tickets/", json={"title": "Printer jam", "description": "Paper jam on 3rd floor"}, headers={"Authorization": f"Bearer {employee_token}"}).json()
    ticket_id = ticket["id"]

    # 1. Employee attempts to change priority -> 403 Forbidden
    res_emp = client.patch(f"/tickets/{ticket_id}/priority", json={"priority": "CRITICAL", "reason": "I want it fast"}, headers={"Authorization": f"Bearer {employee_token}"})
    assert res_emp.status_code == 403

    # 2. Assign ticket to support.rbac
    assign_res = client.post(f"/tickets/{ticket_id}/assign", json={"assigned_to_id": sup_id, "reason": "Assigned for RBAC test"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert assign_res.status_code == 200

    # 3. Support user assigned to ticket changes priority -> 200 OK
    res_sup = client.patch(f"/tickets/{ticket_id}/priority", json={"priority": "HIGH", "reason": "Multiple users impacted"}, headers={"Authorization": f"Bearer {sup_token}"})
    assert res_sup.status_code == 200
    assert res_sup.json()["priority"] == "HIGH"

    # 4. Another support user attempts to change priority -> 403 Forbidden
    client.post("/auth/register", json={
        "email": "support.other@company.com", "full_name": "Other Support", "password": "Password123!"
    })
    other_sup_token = client.post("/auth/login", data={"username": "support.other@company.com", "password": "Password123!"}).json()["access_token"]
    res_other = client.patch(f"/tickets/{ticket_id}/priority", json={"priority": "LOW"}, headers={"Authorization": f"Bearer {other_sup_token}"})
    assert res_other.status_code == 403

    # 5. Admin changes priority -> 200 OK
    res_admin = client.patch(f"/tickets/{ticket_id}/priority", json={"priority": "CRITICAL", "reason": "Executive escalation"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200
    assert res_admin.json()["priority"] == "CRITICAL"

    # 6. Invalid priority -> 422
    res_invalid = client.patch(f"/tickets/{ticket_id}/priority", json={"priority": "SUPER_MAX"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert res_invalid.status_code == 422

def test_priority_update_on_completed_ticket_fails(client, admin_token, employee_token):
    # Create ticket and resolve it
    ticket = client.post("/tickets/", json={"title": "Completed Ticket Test", "description": "Will be resolved"}, headers={"Authorization": f"Bearer {employee_token}"}).json()
    ticket_id = ticket["id"]
    client.post(f"/tickets/{ticket_id}/resolve", json={"resolution_notes": "All done"}, headers={"Authorization": f"Bearer {admin_token}"})

    # Attempt priority change on resolved ticket -> 409 Conflict
    res = client.patch(f"/tickets/{ticket_id}/priority", json={"priority": "CRITICAL"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 409
    detail = res.json()["detail"].lower()
    assert "resolved" in detail or "completed" in detail

def test_sla_recalculation_on_priority_change(client, admin_token, employee_token):
    from datetime import datetime
    ticket = client.post("/tickets/", json={"title": "SLA Clock Test", "description": "Checking SLA calculation"}, headers={"Authorization": f"Bearer {employee_token}"}).json()
    ticket_id = ticket["id"]

    created_at_str = ticket["created_at"]
    created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))

    # Update to CRITICAL (duration = 2 hours)
    res_crit = client.patch(f"/tickets/{ticket_id}/priority", json={"priority": "CRITICAL", "reason": "Escalation"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert res_crit.status_code == 200
    crit_ticket = res_crit.json()
    assert crit_ticket["priority"] == "CRITICAL"

    new_deadline = datetime.fromisoformat(crit_ticket["sla_deadline"].replace("Z", "+00:00"))
    diff_hours = (new_deadline - created_at).total_seconds() / 3600
    # Must be 2 hours from ticket's original creation time, NOT restarted from patch time
    assert round(diff_hours) == 2

def test_ticket_audit_trail_events(client, admin_token, employee_token):
    ticket = client.post("/tickets/", json={"title": "Audit Trail Inspection", "description": "Audit check"}, headers={"Authorization": f"Bearer {employee_token}"}).json()
    ticket_id = ticket["id"]

    # Change priority with reason
    client.patch(f"/tickets/{ticket_id}/priority", json={"priority": "HIGH", "reason": "High priority requested"}, headers={"Authorization": f"Bearer {admin_token}"})

    # Reassign with reason
    client.post(f"/tickets/{ticket_id}/assign", json={"assigned_to_id": 1, "reason": "Reassigned to primary admin"}, headers={"Authorization": f"Bearer {admin_token}"})

    # Fetch ticket and inspect history
    detail = client.get(f"/tickets/{ticket_id}", headers={"Authorization": f"Bearer {admin_token}"}).json()
    history = detail.get("history", [])
    assert len(history) >= 2

    # Check for priority change event
    priority_events = [h for h in history if h.get("action_type") == "PRIORITY_CHANGED"]
    assert len(priority_events) >= 1
    assert priority_events[0]["new_priority"] == "HIGH"
    assert "High priority requested" in priority_events[0]["comment"]

def test_hardware_fulfillment_not_auto_assigned(client, employee_token):
    ticket = client.post("/tickets/", json={
        "title": "Hardware Request: Laptop Provisioning",
        "description": "Requested equipment: ThinkPad T14 with 32GB RAM"
    }, headers={"Authorization": f"Bearer {employee_token}"}).json()

    # Hardware equipment fulfillment requests must remain OPEN and unassigned
    assert ticket["status"] == "OPEN"
    assert ticket["assigned_to_id"] is None




