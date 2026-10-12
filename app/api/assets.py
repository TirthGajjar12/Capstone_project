from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.connection import get_db
from app.models.asset import Asset, AssetAssignment, AssetStatus, AssetType
from app.models.user import User
from app.schemas.asset import AssetCreate, AssetUpdate, AssetAssign, AssetResponse
from app.api.deps import get_current_user, require_role

router = APIRouter(prefix="/assets", tags=["Assets"])

@router.post("/", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(
    asset_in: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"]))  # Admin only
):
    """Register a new asset. Only Admins can register assets."""
    # Check duplicate asset tag or serial number
    if db.query(Asset).filter(Asset.asset_tag == asset_in.asset_tag).first():
        raise HTTPException(status_code=400, detail="Asset tag already exists.")
    if db.query(Asset).filter(Asset.serial_number == asset_in.serial_number).first():
        raise HTTPException(status_code=400, detail="Serial number already exists.")

    new_asset = Asset(
        asset_tag=asset_in.asset_tag,
        asset_type=asset_in.asset_type,
        brand=asset_in.brand,
        model=asset_in.model,
        serial_number=asset_in.serial_number,
        status=AssetStatus.AVAILABLE
    )
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    return new_asset


@router.get("/", response_model=List[AssetResponse])
def list_assets(
    asset_type: Optional[AssetType] = None,
    asset_status: Optional[AssetStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List assets:
    - Admins & Support: can view all assets (with optional filters)
    - Employees: can only view assets assigned to them
    """
    query = db.query(Asset)

    if current_user.role == "EMPLOYEE":
        # Filter only assets assigned to this employee
        query = query.filter(Asset.assigned_to_id == current_user.id)
    else:
        # Admin / Support filters
        if asset_type:
            query = query.filter(Asset.asset_type == asset_type)
        if asset_status:
            query = query.filter(Asset.status == asset_status)

    return query.all()


@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get details of a single asset."""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found.")

    # Employees can only view their own assigned asset
    if current_user.role == "EMPLOYEE" and asset.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this asset.")

    return asset


@router.post("/{asset_id}/assign", response_model=AssetResponse)
def assign_asset(
    asset_id: int,
    assign_in: AssetAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "SUPPORT"]))
):
    """Assign an available asset to an active employee."""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found.")

    if asset.status != AssetStatus.AVAILABLE:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot assign asset with status '{asset.status.value}'. Must be AVAILABLE."
        )

    # Verify target employee exists and is active
    target_user = db.query(User).filter(User.id == assign_in.user_id).first()
    if not target_user or not target_user.is_active:
        raise HTTPException(status_code=404, detail="Target user not found or inactive.")

    # Update asset
    asset.assigned_to_id = target_user.id
    asset.status = AssetStatus.ASSIGNED

    # Log in assignment history table
    assignment_record = AssetAssignment(asset_id=asset.id, user_id=target_user.id)
    db.add(assignment_record)

    db.commit()
    db.refresh(asset)
    return asset


@router.post("/{asset_id}/return", response_model=AssetResponse)
def return_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "SUPPORT"]))
):
    """Return an assigned asset back to AVAILABLE pool."""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found.")

    if asset.status != AssetStatus.ASSIGNED:
        raise HTTPException(status_code=400, detail="Asset is not currently assigned.")

    # Mark active assignment record as returned
    active_assignment = db.query(AssetAssignment).filter(
        AssetAssignment.asset_id == asset.id,
        AssetAssignment.returned_at.is_(None)
    ).first()

    from datetime import datetime, timezone
    if active_assignment:
        active_assignment.returned_at = datetime.now(timezone.utc)

    # Free up the asset
    asset.assigned_to_id = None
    asset.status = AssetStatus.AVAILABLE

    db.commit()
    db.refresh(asset)
    return asset
