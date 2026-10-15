from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.api.deps import require_role, get_current_user
from app.models.user import User
from app.services.report_service import stream_tickets_csv, stream_assets_csv, get_sla_metrics

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/tickets/export")
def export_tickets_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "SUPPORT"]))
):
    """
    Stream tickets as a CSV download using Python generators.
    Memory-efficient: avoids loading entire database query into RAM.
    """
    return StreamingResponse(
        stream_tickets_csv(db),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tickets_report.csv"}
    )


@router.get("/assets/export")
def export_assets_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "SUPPORT"]))
):
    """
    Stream assets as a CSV download using Python generators.
    """
    return StreamingResponse(
        stream_assets_csv(db),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=assets_report.csv"}
    )


@router.get("/sla")
def get_sla_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "SUPPORT"]))
):
    """
    Get live SLA metrics (compliance rate, average resolution time, breaches).
    Restricted to IT Support and Administrator staff.
    """
    return get_sla_metrics(db)
