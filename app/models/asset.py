import enum
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base

class AssetStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ASSIGNED = "ASSIGNED"
    UNDER_REPAIR = "UNDER_REPAIR"
    RETIRED = "RETIRED"
    LOST = "LOST"

class AssetType(str, enum.Enum):
    LAPTOP = "Laptop"
    MONITOR = "Monitor"
    KEYBOARD = "Keyboard"
    MOUSE = "Mouse"
    PRINTER = "Printer"

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_tag = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "LAP-1023"
    asset_type = Column(Enum(AssetType), nullable=False)
    brand = Column(String(100), nullable=False)                              # e.g., "Dell"
    model = Column(String(100), nullable=False)                              # e.g., "Latitude 5440"
    serial_number = Column(String(100), unique=True, nullable=False)
    status = Column(Enum(AssetStatus), default=AssetStatus.AVAILABLE, nullable=False)
    
    # Currently assigned employee (foreign key to users.id)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    assignment_history = relationship("AssetAssignment", back_populates="asset")

    @property
    def asset_id(self) -> str:
        return self.asset_tag

    @property
    def assigned_to_name(self) -> Optional[str]:
        return self.assigned_to.full_name if self.assigned_to else None


class AssetAssignment(Base):
    __tablename__ = "asset_assignments"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    returned_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    asset = relationship("Asset", back_populates="assignment_history")
    user = relationship("User")
