from app.services.websocket_manager import ws_manager
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.database.connection import get_db
from app.models.ticket import Ticket, TicketHistory, TicketStatus, TicketPriority, TicketCategory
from app.models.asset import Asset, AssetStatus, AssetAssignment
from app.models.user import User
from app.schemas.ticket import (
    TicketCreate, TicketResponse, TicketAssign, 
    TicketUpdateStatus, TicketResolve
)
from app.services.ticket_service import calculate_sla_deadline, classify_ticket
from app.api.deps import get_current_user, require_role

router = APIRouter(prefix="/tickets", tags=["Tickets"])

@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
@router.post("/", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_in: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new support ticket:
    - Auto-classifies category & priority using regex/rules if not explicitly provided
    - Calculates SLA deadline based on priority (e.g. CRITICAL=2h, HIGH=4h)
    - Generates ticket number (e.g. INC-1001)
    """
    # 1. Auto-classification if needed
    category = ticket_in.category
    priority = ticket_in.priority
    
    if not category or not priority:
        auto_cat, auto_pri = classify_ticket(f"{ticket_in.title} {ticket_in.description}")
        category = category or auto_cat
        priority = priority or auto_pri

    # 2. SLA calculation
    now = datetime.now(timezone.utc) 
    sla_deadline = calculate_sla_deadline(priority, start_time=now)

    # 3. Create ticket and use DB-generated ID for a race-condition-safe ticket number
    new_ticket = Ticket(
        ticket_number="TEMP",  # Placeholder, replaced after flush
        title=ticket_in.title,
        description=ticket_in.description,
        category=category,
        priority=priority,
        status=TicketStatus.OPEN,
        created_by_id=current_user.id,
        asset_id=ticket_in.asset_id,
        sla_deadline=sla_deadline,
        created_at=now
    )

    db.add(new_ticket)
    db.flush()  # Get DB-generated ID without committing
    new_ticket.ticket_number = f"INC-{1000 + new_ticket.id}"

    db.commit()
    db.refresh(new_ticket)

    # Log creation in audit history
    history = TicketHistory(
        ticket_id=new_ticket.id,
        changed_by_id=current_user.id,
        previous_status=None,
        new_status=TicketStatus.OPEN.value,
        comment="Ticket created."
    )
    db.add(history)
    db.commit()
    db.refresh(new_ticket)

    await ws_manager.broadcast("TICKET_CREATED", {
    "ticket_id": new_ticket.id,
        "ticket_number": new_ticket.ticket_number,
        "title": new_ticket.title,
        "priority": new_ticket.priority.value,
        "status": new_ticket.status.value
    })

    return new_ticket


@router.get("", response_model=List[TicketResponse], include_in_schema=False)
@router.get("/", response_model=List[TicketResponse])
def list_tickets(
    status: Optional[TicketStatus] = None,
    priority: Optional[TicketPriority] = None,
    category: Optional[TicketCategory] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List tickets:
    - Employees: see only tickets they created
    - Support / Admin: see all tickets with optional filters
    """
    query = db.query(Ticket)

    if current_user.role == "EMPLOYEE":
        query = query.filter(Ticket.created_by_id == current_user.id)

    if status:
        query = query.filter(Ticket.status == status)
    if priority:
        query = query.filter(Ticket.priority == priority)
    if category:
        query = query.filter(Ticket.category == category)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            (Ticket.title.ilike(search_pattern)) |
            (Ticket.description.ilike(search_pattern)) |
            (Ticket.ticket_number.ilike(search_pattern))
        )

    return query.order_by(Ticket.created_at.desc()).all()


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve full details of a single ticket."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    if current_user.role == "EMPLOYEE" and ticket.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this ticket.")

    return ticket


@router.post("/{ticket_id}/assign", response_model=TicketResponse)
def assign_ticket(
    ticket_id: int,
    assign_in: TicketAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "SUPPORT"]))
):
    """Assign ticket to an IT Support engineer."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    support_user = db.query(User).filter(User.id == assign_in.assigned_to_id).first()
    if not support_user or support_user.role not in ["SUPPORT", "ADMIN"]:
        raise HTTPException(status_code=400, detail="Target user must have SUPPORT or ADMIN role.")

    # Non-admin support staff can only take an unassigned ticket or assign to themselves
    if current_user.role != "ADMIN":
        if ticket.assigned_to_id is not None and ticket.assigned_to_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Ticket is already assigned to another engineer. Only an administrator can reassign it."
            )
        if assign_in.assigned_to_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Support staff can only assign tickets to themselves."
            )

    prev_status = ticket.status.value
    ticket.assigned_to_id = support_user.id
    ticket.status = TicketStatus.ASSIGNED

    history = TicketHistory(
        ticket_id=ticket.id,
        changed_by_id=current_user.id,
        previous_status=prev_status,
        new_status=TicketStatus.ASSIGNED.value,
        comment=f"Ticket assigned to {support_user.full_name} ({support_user.email})."
    )
    db.add(history)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.patch("/{ticket_id}/status", response_model=TicketResponse)
async def update_ticket_status(
    ticket_id: int,
    status_in: TicketUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "SUPPORT"]))
):
    """Update ticket workflow status (e.g. IN_PROGRESS)."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    # Only the assigned support engineer or Admin can update status
    if current_user.role != "ADMIN" and ticket.assigned_to_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the assigned support engineer or an administrator can update the status of this ticket."
        )

    prev_status = ticket.status.value
    ticket.status = status_in.status

    history = TicketHistory(
        ticket_id=ticket.id,
        changed_by_id=current_user.id,
        previous_status=prev_status,
        new_status=status_in.status.value,
        comment=status_in.comment or f"Status changed to {status_in.status.value}."
    )
    db.add(history)
    db.commit()
    db.refresh(ticket)
    await ws_manager.broadcast("TICKET_STATUS_UPDATED", {
    "ticket_id": ticket.id,
    "ticket_number": ticket.ticket_number,
    "new_status": ticket.status.value
    })


    return ticket


@router.post("/{ticket_id}/resolve", response_model=TicketResponse)
async def resolve_ticket(
    ticket_id: int,
    resolve_in: TicketResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "SUPPORT"]))
):
    """Mark ticket as RESOLVED with resolution notes."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    # Only the assigned support engineer or Admin can resolve
    if current_user.role != "ADMIN" and ticket.assigned_to_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the assigned support engineer or an administrator can resolve this ticket."
        )

    prev_status = ticket.status.value
    ticket.status = TicketStatus.RESOLVED
    ticket.resolution_notes = resolve_in.resolution_notes
    ticket.resolved_at = datetime.now(timezone.utc)

    # If an asset is assigned as part of resolving this ticket:
    if resolve_in.asset_id:
        ticket.asset_id = resolve_in.asset_id
        asset = db.query(Asset).filter(Asset.id == resolve_in.asset_id).first()
        if asset:
            asset.status = AssetStatus.ASSIGNED
            asset.assigned_to_id = ticket.created_by_id
            assignment_record = AssetAssignment(asset_id=asset.id, user_id=ticket.created_by_id)
            db.add(assignment_record)

    history = TicketHistory(
        ticket_id=ticket.id,
        changed_by_id=current_user.id,
        previous_status=prev_status,
        new_status=TicketStatus.RESOLVED.value,
        comment=f"Resolved: {resolve_in.resolution_notes}"
    )
    db.add(history)
    db.commit()
    db.refresh(ticket)

    await ws_manager.broadcast("TICKET_STATUS_UPDATED", {
        "ticket_id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "new_status": ticket.status.value,
        "resolution_notes": ticket.resolution_notes,
    })

    return ticket


@router.post("/{ticket_id}/close", response_model=TicketResponse)
async def close_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Close the ticket once confirmed."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    # Employee who created it or Admin/Support can close
    if current_user.role == "EMPLOYEE" and ticket.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to close this ticket.")

    prev_status = ticket.status.value
    ticket.status = TicketStatus.CLOSED
    ticket.closed_at = datetime.now(timezone.utc)

    history = TicketHistory(
        ticket_id=ticket.id,
        changed_by_id=current_user.id,
        previous_status=prev_status,
        new_status=TicketStatus.CLOSED.value,
        comment="Ticket verified and closed."
    )
    db.add(history)
    db.commit()
    db.refresh(ticket)

    await ws_manager.broadcast("TICKET_STATUS_UPDATED", {
        "ticket_id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "new_status": ticket.status.value,
    })

    return ticket
