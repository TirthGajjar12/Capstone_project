from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from fastapi.websockets import WebSocketState
import jwt
from jwt.exceptions import InvalidTokenError
from sqlalchemy.orm import Session

from app.config import settings
from app.database.connection import get_db
from app.models.user import User
from app.services.websocket_manager import ws_manager

router = APIRouter(tags=["WebSockets"])


@router.websocket("/ws/notifications")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token for authentication"),
):
    """
    Authenticated WebSocket endpoint for real-time ticket alerts.
    Clients must pass a valid JWT as ?token=<jwt> in the query string.
    Clients connect to: ws://host/ws/notifications?token=<jwt>
    """
    # --- JWT Authentication ---
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except InvalidTokenError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Verify the user still exists and is active in DB
    db: Session = next(get_db())
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user or not user.is_active:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        user_id_val = user.id
        user_role_val = user.role
    finally:
        db.close()

    # --- Accept and register the authenticated connection with user_id and role ---
    await ws_manager.connect(websocket, user_id=user_id_val, role=user_role_val)
    try:
        # Keep connection alive; handle optional ping/pong from client
        while True:
            data = await websocket.receive_text()
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_text(f'{{"received": "{data}"}}')
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
