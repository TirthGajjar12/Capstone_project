from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.api.deps import get_current_user
from app.models.user import User
from app.services.external_api import fetch_ip_network_info

router = APIRouter(prefix="/network", tags=["External API Integration"])

@router.get("/diagnostics")
def network_diagnostics(
    ip: Optional[str] = Query(None, description="IP to look up (leave empty for server/client IP)"),
    current_user: User = Depends(get_current_user)
):
    """
    Consumes external network API to diagnose employee network connectivity.
    Demonstrates requests library with timeout, error handling, and performance decorators.
    """
    return fetch_ip_network_info(ip or "")
