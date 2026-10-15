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
    history = relationship("TicketHistory", back_populates="ticket", cascade="all, delete-orphan")

    @property
    def ticket_id(self) -> str:
        return self.ticket_number

    @property
    def created_by_name(self) -> Optional[str]:
        return self.created_by.full_name if self.created_by else None

    @property
    def assigned_to_name(self) -> Optional[str]:
        return self.assigned_to.full_name if self.assigned_to else None



class TicketHistory(Base):
    __tablename__ = "ticket_history"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    ticket = relationship("Ticket", back_populates="history")
    changed_by = relationship("User")
