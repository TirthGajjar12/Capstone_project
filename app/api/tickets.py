from app.services.websocket_manager import ws_manager
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
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
    current_user: User = Depends(require_role(["EMPLOYEE"]))
):
    """
    Create a new support ticket (Employees only):
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

    # Default to HARDWARE category if an asset was attached and no specific category was matched
    if ticket_in.asset_id and category == TicketCategory.OTHER:
        category = TicketCategory.HARDWARE

    # 2. SLA calculation
    now = datetime.now(timezone.utc) 
    sla_deadline = calculate_sla_deadline(priority, start_time=now)

    # 3. Validate asset association
    if ticket_in.asset_id:
        referenced_asset = db.query(Asset).filter(Asset.id == ticket_in.asset_id).first()
        if not referenced_asset:
            raise HTTPException(status_code=404, detail="Referenced hardware asset not found.")
        if referenced_asset.assigned_to_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Not authorized: You can only reference hardware assets currently assigned to you."
            )

    # 4. Create ticket and use DB-generated ID for a race-condition-safe ticket number
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

    # Log creation in audit history in the SAME database transaction
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

    await ws_manager.broadcast_ticket_event(
        "TICKET_CREATED",
        {
            "ticket_id": new_ticket.id,
            "id": new_ticket.id,
            "ticket_number": new_ticket.ticket_number,
            "title": new_ticket.title,
            "category": new_ticket.category.value,
            "priority": new_ticket.priority.value,
            "status": new_ticket.status.value
        },
        creator_id=new_ticket.created_by_id
    )

    return new_ticket


@router.get("", response_model=List[TicketResponse], include_in_schema=False)
@router.get("/", response_model=List[TicketResponse])
def list_tickets(
    response: Response,
    status: Optional[TicketStatus] = None,
    priority: Optional[TicketPriority] = None,
    category: Optional[TicketCategory] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Max number of records to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List tickets:
    - Employees: see only tickets they created
    - Support / Admin: see all tickets with optional filters
    - Supports pagination via skip and limit query parameters
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

    # Set total count header for pagination awareness
    total_count = query.count()
    response.headers["X-Total-Count"] = str(total_count)

    query = query.order_by(Ticket.created_at.desc())

    if skip:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)

    return query.all()


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
async def assign_ticket(
    ticket_id: int,
    assign_in: TicketAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "SUPPORT"]))
):
    """Assign ticket to an IT Support engineer."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    # Bug 10 fix: assignment only allowed from OPEN or ASSIGNED
    if ticket.status not in (TicketStatus.OPEN, TicketStatus.ASSIGNED):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot assign a ticket that is already {ticket.status.value}."
        )

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

    await ws_manager.broadcast_ticket_event(
        "TICKET_ASSIGNED",
        {
            "id": ticket.id,
            "ticket_id": ticket.id,
            "ticket_number": ticket.ticket_number,
            "status": ticket.status.value,
            "assigned_to_id": ticket.assigned_to_id,
            "assigned_to_name": support_user.full_name
        },
        creator_id=ticket.created_by_id,
        assigned_to_id=ticket.assigned_to_id
    )

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

    # Enforce allowed transitions:
    # OPEN / ASSIGNED -> IN_PROGRESS
    ALLOWED_TRANSITIONS: dict[TicketStatus, list[TicketStatus]] = {
        TicketStatus.OPEN: [TicketStatus.IN_PROGRESS],
        TicketStatus.ASSIGNED: [TicketStatus.IN_PROGRESS],
        TicketStatus.IN_PROGRESS: [TicketStatus.IN_PROGRESS],  # idempotent
    }
    allowed = ALLOWED_TRANSITIONS.get(ticket.status, [])
    if status_in.status not in allowed:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Transition from {ticket.status.value} to {status_in.status.value} is not allowed. "
                f"Use the dedicated /resolve or /close endpoints for terminal states."
            )
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

    await ws_manager.broadcast_ticket_event(
        "TICKET_STATUS_UPDATED",
        {
            "id": ticket.id,
            "ticket_id": ticket.id,
            "ticket_number": ticket.ticket_number,
            "status": ticket.status.value,
            "new_status": ticket.status.value
        },
        creator_id=ticket.created_by_id,
        assigned_to_id=ticket.assigned_to_id
    )

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

    # Cannot resolve an already resolved or closed ticket
    if ticket.status in (TicketStatus.RESOLVED, TicketStatus.CLOSED):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot resolve a ticket with status {ticket.status.value}. Ticket is already resolved or closed."
        )

    # Bug 8 & 9 fix: validate asset BEFORE mutating anything
    asset = None
    if resolve_in.asset_id:
        asset = db.query(Asset).filter(Asset.id == resolve_in.asset_id).first()
        if not asset:
            raise HTTPException(
                status_code=404,
                detail=f"Asset with id {resolve_in.asset_id} not found."
            )
        if asset.status != AssetStatus.AVAILABLE:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Asset {asset.asset_tag or asset.id} is not available for assignment "
                    f"(current status: {asset.status.value})."
                )
            )

    # All validations passed — mutate in a single transaction
    prev_status = ticket.status.value
    ticket.status = TicketStatus.RESOLVED
    ticket.resolution_notes = resolve_in.resolution_notes
    ticket.resolved_at = datetime.now(timezone.utc)

    if asset:
        ticket.asset_id = asset.id
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

    await ws_manager.broadcast_ticket_event(
        "TICKET_STATUS_UPDATED",
        {
            "id": ticket.id,
            "ticket_id": ticket.id,
            "ticket_number": ticket.ticket_number,
            "status": ticket.status.value,
            "new_status": ticket.status.value,
            "resolution_notes": ticket.resolution_notes,
        },
        creator_id=ticket.created_by_id,
        assigned_to_id=ticket.assigned_to_id
    )

    if asset:
        await ws_manager.broadcast_asset_event(
            "ASSET_ASSIGNED",
            {
                "id": asset.id,
                "asset_tag": asset.asset_tag,
                "status": asset.status.value,
                "assigned_to_id": asset.assigned_to_id,
            },
            target_user_id=asset.assigned_to_id
        )

    return ticket


@router.post("/{ticket_id}/close", response_model=TicketResponse)
async def close_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Close the ticket once confirmed resolved."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    # Bug 11 fix: closing is only meaningful after resolution
    if ticket.status != TicketStatus.RESOLVED:
        raise HTTPException(
            status_code=409,
            detail=f"Ticket cannot be closed from status {ticket.status.value}. It must be RESOLVED first."
        )

    # Bug 11 fix: only the employee who created it, or an Admin, may close
    if current_user.role == "EMPLOYEE" and ticket.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to close this ticket.")

    if current_user.role == "SUPPORT":
        raise HTTPException(
            status_code=403,
            detail="Support staff cannot close tickets. The requestor or an administrator must confirm closure."
        )

    prev_status = ticket.status.value
    ticket.status = TicketStatus.CLOSED
    ticket.closed_at = datetime.now(timezone.utc)

    history = TicketHistory(
        ticket_id=ticket.id,
        changed_by_id=current_user.id,
        previous_status=prev_status,
        new_status=TicketStatus.CLOSED.value,
        comment="Ticket verified and closed by requestor."
    )
    db.add(history)
    db.commit()
    db.refresh(ticket)

    await ws_manager.broadcast_ticket_event(
        "TICKET_STATUS_UPDATED",
        {
            "id": ticket.id,
            "ticket_id": ticket.id,
            "ticket_number": ticket.ticket_number,
            "status": ticket.status.value,
            "new_status": ticket.status.value,
        },
        creator_id=ticket.created_by_id,
        assigned_to_id=ticket.assigned_to_id
    )

    return ticket
