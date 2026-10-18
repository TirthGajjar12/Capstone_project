from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.connection import get_db
from app.models.asset import Asset, AssetAssignment, AssetStatus, AssetType
from app.models.user import User
from app.schemas.asset import AssetCreate, AssetAssign, AssetResponse
from app.api.deps import get_current_user, require_role
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/assets", tags=["Assets"])

@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
@router.post("/", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    asset_in: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"]))  # Admin only
):
    """Register a new asset. Only Admins can register assets."""
    # Check or auto-generate asset tag
    tag = asset_in.asset_tag.strip() if asset_in.asset_tag else None
    if tag:
        if db.query(Asset).filter(Asset.asset_tag == tag).first():
            raise HTTPException(status_code=400, detail="Asset tag already exists.")
    else:
        # Auto-generate unique asset_tag based on type
        prefix_map = {
            AssetType.LAPTOP: "LAP",
            AssetType.MONITOR: "MON",
            AssetType.KEYBOARD: "KEY",
            AssetType.MOUSE: "MOU",
            AssetType.PRINTER: "PRN"
        }
        prefix = prefix_map.get(asset_in.asset_type, "AST")
        import random
        for _ in range(50):
            candidate = f"{prefix}-{random.randint(1000, 9999)}"
            if not db.query(Asset).filter(Asset.asset_tag == candidate).first():
                tag = candidate
                break
        if not tag:
            import uuid
            tag = f"{prefix}-{uuid.uuid4().hex[:6].upper()}"

    if db.query(Asset).filter(Asset.serial_number == asset_in.serial_number).first():
        raise HTTPException(status_code=400, detail="Serial number already exists.")

    new_asset = Asset(
        asset_tag=tag,
        asset_type=asset_in.asset_type,
        brand=asset_in.brand,
        model=asset_in.model,
        serial_number=asset_in.serial_number,
        status=AssetStatus.AVAILABLE
    )
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    await ws_manager.broadcast_asset_event(
        "ASSET_CREATED",
        {"id": new_asset.id, "asset_tag": new_asset.asset_tag, "status": new_asset.status.value}
    )
    return new_asset


# Case-insensitive lookup dictionaries for query parameters
ASSET_TYPE_LOOKUP = {
    "laptop": [AssetType.LAPTOP],
    "laptops": [AssetType.LAPTOP],
    "monitor": [AssetType.MONITOR],
    "monitors": [AssetType.MONITOR],
    "keyboard": [AssetType.KEYBOARD],
    "keyboards": [AssetType.KEYBOARD],
    "mouse": [AssetType.MOUSE],
    "mice": [AssetType.MOUSE],
    "printer": [AssetType.PRINTER],
    "printers": [AssetType.PRINTER],
    "peripheral": [AssetType.KEYBOARD, AssetType.MOUSE, AssetType.PRINTER],
    "peripherals": [AssetType.KEYBOARD, AssetType.MOUSE, AssetType.PRINTER],
}
for _et in AssetType:
    ASSET_TYPE_LOOKUP[_et.value.lower()] = [_et]
    ASSET_TYPE_LOOKUP[_et.name.lower()] = [_et]

ASSET_STATUS_LOOKUP = {
    _st.value.lower(): _st for _st in AssetStatus
}
for _st in AssetStatus:
    ASSET_STATUS_LOOKUP[_st.name.lower()] = _st


@router.get("", response_model=List[AssetResponse], include_in_schema=False)
@router.get("/", response_model=List[AssetResponse])
def list_assets(
    response: Response,
    asset_type: Optional[str] = Query(None, description="Asset type (e.g. Laptop, Monitor, Peripherals, Keyboard)"),
    asset_status: Optional[str] = Query(None, description="Asset status (e.g. AVAILABLE, ASSIGNED, UNDER_REPAIR)"),
    search: Optional[str] = None,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Max number of records to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List assets with optional filtering and pagination:
    - Employees: can ONLY view assets assigned to their account.
    - Admin & Support: can view all company assets in inventory.
    - Supports case-insensitive type, status, employee name search, and skip/limit pagination.
    """
    query = db.query(Asset)

    if current_user.role == "EMPLOYEE":
        # Normal employees only see hardware assigned to them
        query = query.filter(Asset.assigned_to_id == current_user.id)

    # Filtering applies across all roles (Admin, Support, and Employee)
    if asset_type and asset_type.strip():
        matched_types = set()
        for part in asset_type.split(","):
            cleaned = part.strip().lower()
            if cleaned in ASSET_TYPE_LOOKUP:
                matched_types.update(ASSET_TYPE_LOOKUP[cleaned])
        if matched_types:
            query = query.filter(Asset.asset_type.in_(list(matched_types)))

    if asset_status and asset_status.strip():
        status_key = asset_status.strip().lower()
        if status_key in ASSET_STATUS_LOOKUP:
            query = query.filter(Asset.status == ASSET_STATUS_LOOKUP[status_key])

    if search and search.strip():
        search_pattern = f"%{search.strip()}%"
        query = query.outerjoin(User, Asset.assigned_to_id == User.id).filter(
            (Asset.asset_tag.ilike(search_pattern)) |
            (Asset.brand.ilike(search_pattern)) |
            (Asset.model.ilike(search_pattern)) |
            (Asset.serial_number.ilike(search_pattern)) |
            (User.full_name.ilike(search_pattern)) |
            (User.email.ilike(search_pattern))
        )

    # Set total matching count in header for pagination awareness
    total_count = query.count()
    response.headers["X-Total-Count"] = str(total_count)

    query = query.order_by(Asset.id.asc())

    if skip:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)

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

    # Normal employees can only view their own assigned hardware
    if current_user.role == "EMPLOYEE" and asset.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this asset.")

    return asset



@router.post("/{asset_id}/assign", response_model=AssetResponse)
async def assign_asset(
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
    if target_user.role not in ["EMPLOYEE", "SUPPORT"]:
        raise HTTPException(
            status_code=400,
            detail="Hardware assets can only be assigned to active employees or support staff."
        )

    # Update asset
    asset.assigned_to_id = target_user.id
    asset.status = AssetStatus.ASSIGNED

    # Log in assignment history table
    assignment_record = AssetAssignment(asset_id=asset.id, user_id=target_user.id)
    db.add(assignment_record)

    db.commit()
    db.refresh(asset)

    await ws_manager.broadcast_asset_event(
        "ASSET_ASSIGNED",
        {
            "id": asset.id,
            "asset_tag": asset.asset_tag,
            "status": asset.status.value,
            "assigned_to_id": asset.assigned_to_id,
            "assigned_to_name": target_user.full_name
        },
        target_user_id=asset.assigned_to_id
    )

    return asset


@router.post("/{asset_id}/return", response_model=AssetResponse)
async def return_asset(
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

    await ws_manager.broadcast_asset_event(
        "ASSET_RETURNED",
        {
            "id": asset.id,
            "asset_tag": asset.asset_tag,
            "status": asset.status.value,
            "assigned_to_id": None
        },
        target_user_id=active_assignment.user_id if active_assignment else None
    )

    return asset
