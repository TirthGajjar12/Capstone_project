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
        if t.resolved_at:
            breached = t.resolved_at > t.sla_deadline
        else:
            breached = datetime.now(timezone.utc) > t.sla_deadline

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


def get_sla_metrics(db: Session) -> dict:
    """
    Calculates SLA statistics across all tickets.
    """
    total = db.query(Ticket).count()
    resolved = db.query(Ticket).filter(Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])).all()
    
    breached_count = 0
    total_resolution_seconds = 0

    for t in resolved:
        if t.resolved_at and t.resolved_at > t.sla_deadline:
            breached_count += 1
        
        if t.resolved_at:
            delta = t.resolved_at - t.created_at
            total_resolution_seconds += delta.total_seconds()

    avg_resolution_hours = (
        round((total_resolution_seconds / len(resolved)) / 3600, 2)
        if resolved else 0.0
    )

    return {
        "total_tickets": total,
        "resolved_tickets": len(resolved),
        "open_tickets": total - len(resolved),
        "breached_tickets": breached_count,
        "sla_compliance_rate_pct": round(((len(resolved) - breached_count) / len(resolved)) * 100, 2) if resolved else 100.0,
        "avg_resolution_time_hours": avg_resolution_hours
    }
