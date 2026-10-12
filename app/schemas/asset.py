from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.asset import AssetStatus, AssetType
from app.schemas.user import UserResponse

# 1. Base Schema
class AssetBase(BaseModel):
    asset_tag: str
    asset_type: AssetType
    brand: str
    model: str
    serial_number: str

# 2. Schema for Creating an Asset (Admin only)
class AssetCreate(AssetBase):
    pass

# 3. Schema for Updating Asset Status/Details
class AssetUpdate(BaseModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    status: Optional[AssetStatus] = None

# 4. Schema for Assigning an Asset to a User
class AssetAssign(BaseModel):
    user_id: int

# 5. Schema for Asset Response
class AssetResponse(AssetBase):
    id: int
    status: AssetStatus
    assigned_to_id: Optional[int] = None
    assigned_to: Optional[UserResponse] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
