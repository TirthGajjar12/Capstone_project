import enum
from typing import Optional
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base

class TicketCategory(str, enum.Enum):
    HARDWARE = "Hardware"
    SOFTWARE = "Software"
    NETWORK = "Network"
    ACCESS = "Access"
    OTHER = "Other"

class TicketPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class TicketStatus(str, enum.Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "INC-1001"
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    
    category = Column(Enum(TicketCategory), nullable=False)
    priority = Column(Enum(TicketPriority), default=TicketPriority.MEDIUM, nullable=False)
    status = Column(Enum(TicketStatus), default=TicketStatus.OPEN, nullable=False)

    # Relationships to users
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Optional link to an asset (e.g. laptop broken)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)

    # Assignment tracking
    assignment_mode = Column(String(20), nullable=True, default=None)  # "AUTO", "MANUAL", or None

    # SLA tracking fields
    sla_deadline = Column(DateTime(timezone=True), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # ORM Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    asset = relationship("Asset")
    history = relationship("TicketHistory", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketHistory.created_at.asc()")

    @property
    def ticket_id(self) -> str:
        return self.ticket_number

    @property
    def created_by_name(self) -> Optional[str]:
        return self.created_by.full_name if self.created_by else None

    @property
    def assigned_to_name(self) -> Optional[str]:
        return self.assigned_to.full_name if self.assigned_to else None

    @property
    def is_sla_breached(self) -> bool:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        deadline = self.sla_deadline
        if not deadline:
            return False
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        if self.resolved_at:
            resolved = self.resolved_at
            if resolved.tzinfo is None:
                resolved = resolved.replace(tzinfo=timezone.utc)
            return resolved > deadline
        return now > deadline



class TicketHistory(Base):
    __tablename__ = "ticket_history"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # None indicates SYSTEM
    
    action_type = Column(String(50), nullable=True)  # CREATED, AUTO_ASSIGNMENT, ASSIGNED, REASSIGNED, PRIORITY_CHANGED, STATUS_CHANGED, RESOLVED, CLOSED
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    previous_priority = Column(String(50), nullable=True)
    new_priority = Column(String(50), nullable=True)
    previous_assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    new_assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    ticket = relationship("Ticket", back_populates="history")
    changed_by = relationship("User", foreign_keys=[changed_by_id])
    previous_assignee = relationship("User", foreign_keys=[previous_assignee_id])
    new_assignee = relationship("User", foreign_keys=[new_assignee_id])

    @property
    def changed_by_name(self) -> str:
        if self.changed_by:
            return self.changed_by.full_name
        return "System"

    @property
    def previous_assignee_name(self) -> Optional[str]:
        return self.previous_assignee.full_name if self.previous_assignee else None

    @property
    def new_assignee_name(self) -> Optional[str]:
        return self.new_assignee.full_name if self.new_assignee else None
