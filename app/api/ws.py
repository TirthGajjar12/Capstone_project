from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_manager import ws_manager

router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time ticket alerts and dashboard notifications.
    Clients connect to: ws://127.0.0.1:8000/ws/notifications
    """
    await ws_manager.connect(websocket)
    try:
        # Keep connection alive and listen for optional ping/pong messages
        while True:
            data = await websocket.receive_text()
            # Echo or acknowledge incoming client messages
            await websocket.send_text(f'{{"received": "{data}"}}')
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
