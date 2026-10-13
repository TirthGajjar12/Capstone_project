from pydantic import BaseModel, ConfigDict, computed_field
from typing import Optional, List
from datetime import datetime, timezone
from app.models.ticket import TicketCategory, TicketPriority, TicketStatus
from app.schemas.user import UserResponse
from app.schemas.asset import AssetResponse

# 1. Base Ticket Schema
class TicketBase(BaseModel):
    title: str
    description: str

# 2. Schema for Creating a Ticket (Category & Priority are optional; auto-classified if omitted)
class TicketCreate(TicketBase):
    category: Optional[TicketCategory] = None
    priority: Optional[TicketPriority] = None
    asset_id: Optional[int] = None

# 3. Schema for Assigning a Ticket to IT Support
class TicketAssign(BaseModel):
    assigned_to_id: int

# 4. Schema for Updating Ticket Status
class TicketUpdateStatus(BaseModel):
    status: TicketStatus
    comment: Optional[str] = None

# 5. Schema for Resolving a Ticket
class TicketResolve(BaseModel):
    resolution_notes: str

# 6. Ticket History Response
class TicketHistoryResponse(BaseModel):
    id: int
    changed_by_id: int
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    comment: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# 7. Complete Ticket Response (with SLA computed info)
class TicketResponse(TicketBase):
    id: int
    ticket_number: str
    ticket_id: Optional[str] = None
    category: TicketCategory
    priority: TicketPriority
    status: TicketStatus
    created_by_id: int
    created_by: Optional[UserResponse] = None
    created_by_name: Optional[str] = None
    assigned_to_id: Optional[int] = None
    assigned_to: Optional[UserResponse] = None
    assigned_to_name: Optional[str] = None
    asset_id: Optional[int] = None
    asset: Optional[AssetResponse] = None
    
    sla_deadline: datetime
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    
    created_at: datetime
    updated_at: Optional[datetime] = None
    history: List[TicketHistoryResponse] = []

    # Dynamic computed property for SLA — serialized in JSON via Pydantic V2
    @computed_field
    @property
    def is_sla_breached(self) -> bool:
        now = datetime.now(timezone.utc)
        deadline = self.sla_deadline
        # Normalize naive datetimes (e.g., from SQLite in tests) to UTC
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        if self.resolved_at:
            resolved = self.resolved_at
            if resolved.tzinfo is None:
                resolved = resolved.replace(tzinfo=timezone.utc)
            return resolved > deadline
        return now > deadline

    model_config = ConfigDict(from_attributes=True)
