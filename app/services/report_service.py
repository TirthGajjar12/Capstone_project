from datetime import datetime, timezone
from typing import Generator
from sqlalchemy.orm import Session
from app.models.ticket import Ticket, TicketStatus
from app.models.asset import Asset, AssetStatus

def stream_tickets_csv(db: Session) -> Generator[str, None, None]:
    """
    Generator-based CSV report generation (README Section 9).
    Uses 'yield' to stream rows one-by-one to avoid high memory consumption.
    """
    # 1. Yield CSV Header
    yield "Ticket Number,Title,Category,Priority,Status,Created At,SLA Deadline,Resolved At,Is Breached\n"

    # 2. Query in batches using yield_per to stream from PostgreSQL
    tickets = db.query(Ticket).order_by(Ticket.id.asc()).yield_per(100)

    for t in tickets:
        # Calculate if SLA was breached
        if t.sla_deadline:
            deadline = t.sla_deadline if t.sla_deadline.tzinfo else t.sla_deadline.replace(tzinfo=timezone.utc)
            if t.resolved_at:
                resolved = t.resolved_at if t.resolved_at.tzinfo else t.resolved_at.replace(tzinfo=timezone.utc)
                breached = resolved > deadline
            else:
                breached = datetime.now(timezone.utc) > deadline
        else:
            breached = False

        row = (
            f'"{t.ticket_number}",'
            f'"{t.title.replace(chr(34), chr(34)*2)}",'
            f'"{t.category.value}",'
            f'"{t.priority.value}",'
            f'"{t.status.value}",'
            f'"{t.created_at}",'
            f'"{t.sla_deadline}",'
            f'"{t.resolved_at or ""}",'
            f'"{breached}"\n'
        )
        yield row


def stream_assets_csv(db: Session) -> Generator[str, None, None]:
    """
    Generator-based CSV streaming for IT Assets.
    """
    yield "Asset Tag,Type,Brand,Model,Serial Number,Status,Assigned To User ID\n"

    assets = db.query(Asset).order_by(Asset.id.asc()).yield_per(100)

    for a in assets:
        row = (
            f'"{a.asset_tag}",'
            f'"{a.asset_type.value}",'
            f'"{a.brand}",'
            f'"{a.model}",'
            f'"{a.serial_number}",'
            f'"{a.status.value}",'
            f'"{a.assigned_to_id or ""}"\n'
        )
        yield row


def get_sla_metrics(db: Session, user: object = None) -> dict:
    """
    Calculates SLA statistics across tickets, including active overdue requests.
    If user is an EMPLOYEE, scopes metrics to tickets created by the user.
    """
    query = db.query(Ticket)
    if user and getattr(user, "role", "") == "EMPLOYEE":
        query = query.filter(Ticket.created_by_id == getattr(user, "id", None))

    total = query.count()
    resolved = query.filter(Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])).all()
    active_tickets = query.filter(~Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])).all()

    now = datetime.now(timezone.utc)
    breached_resolved_count = 0
    total_resolution_seconds = 0

    for t in resolved:
        if t.sla_deadline and t.resolved_at:
            deadline = t.sla_deadline if t.sla_deadline.tzinfo else t.sla_deadline.replace(tzinfo=timezone.utc)
            resolved_at = t.resolved_at if t.resolved_at.tzinfo else t.resolved_at.replace(tzinfo=timezone.utc)
            if resolved_at > deadline:
                breached_resolved_count += 1

        if t.resolved_at and t.created_at:
            created_at = t.created_at if t.created_at.tzinfo else t.created_at.replace(tzinfo=timezone.utc)
            resolved_at = t.resolved_at if t.resolved_at.tzinfo else t.resolved_at.replace(tzinfo=timezone.utc)
            delta = resolved_at - created_at
            total_resolution_seconds += delta.total_seconds()

    active_overdue_count = 0
    for t in active_tickets:
        if t.sla_deadline:
            deadline = t.sla_deadline if t.sla_deadline.tzinfo else t.sla_deadline.replace(tzinfo=timezone.utc)
            if now > deadline:
                active_overdue_count += 1

    total_breached = breached_resolved_count + active_overdue_count

    avg_resolution_hours = (
        round((total_resolution_seconds / len(resolved)) / 3600, 2)
        if resolved else 0.0
    )

    # Compliant tickets are tickets resolved within their SLA deadline
    compliant_resolved = len(resolved) - breached_resolved_count
    # Evaluated tickets are all tickets with settled or breached SLA outcomes (resolved + active overdue)
    total_evaluated = len(resolved) + active_overdue_count

    compliance_rate = (
        round((compliant_resolved / total_evaluated) * 100, 2)
        if total_evaluated > 0 else 100.0
    )

    return {
        "total_tickets": total,
        "resolved_tickets": len(resolved),
        "open_tickets": len(active_tickets),
        "breached_tickets": total_breached,
        "resolved_breached_tickets": breached_resolved_count,
        "active_overdue_tickets": active_overdue_count,
        "sla_compliance_rate_pct": compliance_rate,
        "avg_resolution_time_hours": avg_resolution_hours
    }
