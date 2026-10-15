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

# Import the new Auth Router
from app.api.auth import router as auth_router
from app.api.assets import router as assets_router
from app.api.tickets import router as tickets_router
from app.api.reports import router as reports_router
from app.api.network import router as network_router
from app.api.ws import router as ws_router


Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.APP_NAME)

# CORS middleware — explicit trusted frontend origins with credentials support
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
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


@app.exception_handler(ResourceNotFoundError)
def resource_not_found_handler(request: Request, exc: ResourceNotFoundError):
    return JSONResponse(status_code=404, content={"detail": exc.message})
@app.exception_handler(ITAssetManagerException)
def domain_exception_handler(request: Request, exc: ITAssetManagerException):
    return JSONResponse(status_code=400, content={"detail": exc.message})


