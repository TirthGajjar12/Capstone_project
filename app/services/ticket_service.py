import re
from datetime import datetime, timedelta, timezone
from typing import Tuple
from app.models.ticket import TicketPriority, TicketCategory

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
