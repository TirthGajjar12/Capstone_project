from pydantic import BaseModel, ConfigDict, model_validator
from typing import Optional
from datetime import datetime
from app.models.asset import AssetStatus, AssetType
from app.schemas.user import UserResponse

# 1. Base Schema
class AssetBase(BaseModel):
    asset_tag: Optional[str] = None
    asset_type: AssetType
    brand: str
    model: str
    serial_number: str

# 2. Schema for Creating an Asset (Admin only)
class AssetCreate(AssetBase):
    pass

# 3. Schema for Updating Asset Status/Details

# 4. Schema for Assigning an Asset to a User
class AssetAssign(BaseModel):
    user_id: int

# 5. Schema for Asset Response
class AssetResponse(BaseModel):
    id: int
    asset_tag: str
    asset_id: Optional[str] = None
    asset_type: AssetType
    brand: str
    model: str
    serial_number: str
    status: AssetStatus
    assigned_to_id: Optional[int] = None
    assigned_to: Optional[UserResponse] = None
    assigned_to_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def populate_computed_fields(self):
        if not self.asset_id:
            self.asset_id = self.asset_tag
        if not self.assigned_to_name and self.assigned_to:
            self.assigned_to_name = self.assigned_to.full_name
        return self

