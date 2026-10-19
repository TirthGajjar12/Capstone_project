from fastapi import Request
from fastapi import FastAPI, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.config import settings
from app.database.connection import get_db, engine
from app.database.base import Base
from app.utils.exceptions import ITAssetManagerException, ResourceNotFoundError
from app.services.websocket_manager import ws_manager


import app.models.user
import app.models.asset
import app.models.ticket

from typing import List
from app.api.deps import require_role
from app.models.user import User
from app.models.asset import Asset, AssetStatus
from app.schemas.asset import AssetResponse

# Import the new Auth Router
from app.api.auth import router as auth_router
from app.api.assets import router as assets_router
from app.api.tickets import router as tickets_router
from app.api.reports import router as reports_router
from app.api.network import router as network_router
from app.api.ws import router as ws_router


from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Only initialize production tables on actual application startup, not upon test module import
    if settings.APP_ENV != "test":
        try:
            Base.metadata.create_all(bind=engine)
            from app.database.migrations import run_migrations
            run_migrations(engine)
        except Exception:
            # Non-blocking if database is offline during offline tool tasks
            pass
    yield

app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

# CORS middleware — explicit trusted frontend origins with credentials support
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https://.*\.workers\.dev|https://.*\.pages\.dev",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register our routes
app.include_router(auth_router)
app.include_router(assets_router)
app.include_router(tickets_router)
app.include_router(reports_router)
app.include_router(network_router)
app.include_router(ws_router)

@app.get("/")
def root():
    return {
        "message": f"{settings.APP_NAME} is up and running!",
        "env": settings.APP_ENV
    }

@app.get("/health/db")
def check_db_health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "healthy", "database": "PostgreSQL connected successfully!"}

@app.get("/inventory/available", response_model=List[AssetResponse], tags=["Assets"])
def get_root_available_inventory(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "SUPPORT"]))
):
    """List all available assets for allocation. Strictly restricted to Admin and Support staff."""
    return db.query(Asset).filter(Asset.status == AssetStatus.AVAILABLE).order_by(Asset.id.asc()).all()


@app.exception_handler(ResourceNotFoundError)
def resource_not_found_handler(request: Request, exc: ResourceNotFoundError):
    return JSONResponse(status_code=404, content={"detail": exc.message})
@app.exception_handler(ITAssetManagerException)
def domain_exception_handler(request: Request, exc: ITAssetManagerException):
    return JSONResponse(status_code=400, content={"detail": exc.message})


