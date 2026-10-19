import re
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, TYPE_CHECKING
from app.models.ticket import TicketPriority, TicketCategory

if TYPE_CHECKING:
    from app.models.user import User


# SLA hours mapping
SLA_HOURS = {
    TicketPriority.CRITICAL: 2,
    TicketPriority.HIGH: 4,
    TicketPriority.MEDIUM: 8,
    TicketPriority.LOW: 24,
}

def calculate_sla_deadline(priority: TicketPriority, start_time: datetime = None) -> datetime:
    """Calculates SLA deadline from creation time based on priority."""
    if not start_time:
        start_time = datetime.now(timezone.utc)
    hours = SLA_HOURS.get(priority, 8)
    return start_time + timedelta(hours=hours)

def classify_ticket(text: str) -> Tuple[TicketCategory, TicketPriority]:
    """
    Rule-based ticket classification (README Section 6):
    Uses regex, keyword matching, and string normalization to auto-detect category and priority.
    """
    clean_text = text.lower()

    # Priority rules
    critical_keywords = [r"\bcritical\b", r"\bemergency\b", r"\bproduction down\b", r"\bserver crash\b"]
    high_keywords = [r"\bnot starting\b", r"\bwon't boot\b", r"\bbroken\b", r"\burgent\b", r"\bblue screen\b"]
    
    if any(re.search(kw, clean_text) for kw in critical_keywords): #this uses variable kw to take each value and compares them to clean_text
        priority = TicketPriority.CRITICAL
    elif any(re.search(kw, clean_text) for kw in high_keywords):
        priority = TicketPriority.HIGH
    else:
        priority = TicketPriority.MEDIUM

    # Category rules
    if re.search(r"\b(laptop|monitor|screen|keyboard|mouse|printer|hardware|charger)\b", clean_text):
        category = TicketCategory.HARDWARE
    elif re.search(r"\b(wifi|internet|network|vpn|connection|dns)\b", clean_text):
        category = TicketCategory.NETWORK
    elif re.search(r"\b(password|login|access|permission|account|unlock)\b", clean_text):
        category = TicketCategory.ACCESS
    elif re.search(r"\b(software|install|app|crash|bug|error|license|outlook|teams)\b", clean_text):
        category = TicketCategory.SOFTWARE
    else:
        category = TicketCategory.OTHER

    return category, priority


def is_equipment_fulfillment_request(title: str, description: str, category: TicketCategory) -> bool:
    """
    Distinguishes hardware provisioning / fulfillment requests from ordinary repair/support incidents.
    Equipment fulfillment requests are preserved for inventory allocation rather than ordinary incident triage.
    """
    if category != TicketCategory.HARDWARE:
        return False
    t_clean = (title or "").lower()
    d_clean = (description or "").lower()
    return (
        t_clean.startswith("hardware request") or
        "request:" in t_clean or
        "request equipment" in t_clean or
        "requested equipment:" in d_clean
    )


def find_least_loaded_support_engineer(db) -> "Optional[User]":
    """
    Selects an active IT Support engineer with the lowest active workload:
    - Only users with role == 'SUPPORT' and is_active == True are eligible.
    - Admins and inactive users are strictly excluded.
    - Workload is measured as the count of active tickets in ASSIGNED or IN_PROGRESS status.
    - RESOLVED and CLOSED tickets are strictly excluded.
    - Deterministic tie-breaker: lowest User.id among engineers with equal workload.
    - Returns None if no active SUPPORT user is available.
    """
    from sqlalchemy import func
    from app.models.user import User
    from app.models.ticket import Ticket, TicketStatus

    # 1. Fetch eligible active SUPPORT engineers
    support_engineers = (
        db.query(User)
        .filter(User.role == "SUPPORT", User.is_active == True)
        .order_by(User.id.asc())
        .all()
    )

    if not support_engineers:
        return None

    # 2. Query active workloads for all eligible support engineers in a single aggregated query
    support_ids = [u.id for u in support_engineers]
    workloads = {u_id: 0 for u_id in support_ids}

    active_counts = (
        db.query(Ticket.assigned_to_id, func.count(Ticket.id))
        .filter(
            Ticket.assigned_to_id.in_(support_ids),
            Ticket.status.in_([TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS])
        )
        .group_by(Ticket.assigned_to_id)
        .all()
    )

    for assigned_id, count in active_counts:
        workloads[assigned_id] = count

    # 3. Deterministic selection: lowest workload; on tie, lowest user.id
    try:
        best_engineer = min(support_engineers, key=lambda eng: (workloads.get(eng.id, 0), getattr(eng, 'id', 0)))
        return best_engineer
    except (ValueError, TypeError):
        return None

