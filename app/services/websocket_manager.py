import json
from typing import Dict, Optional
from fastapi import WebSocket


class ConnectionManager:
    """
    In-memory WebSocket manager with connection authentication metadata (user_id, role).
    Supports role-scoped and user-targeted real-time events to avoid data leakage across users.
    """
    def __init__(self):
        # Maps active WebSocket to its user metadata: {"user_id": int, "role": str}
        self.active_connections: Dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket, user_id: int, role: str):
        """Accepts connection and associates it with the authenticated user."""
        await websocket.accept()
        self.active_connections[websocket] = {"user_id": user_id, "role": role}

    def disconnect(self, websocket: WebSocket):
        """Removes the connection upon disconnect."""
        if websocket in self.active_connections:
            del self.active_connections[websocket]

    async def _send_payload(self, websocket: WebSocket, payload: str):
        try:
            await websocket.send_text(payload)
        except Exception:
            self.disconnect(websocket)

    async def broadcast(self, event_type: str, data: dict):
        """Broadcasts event to all active connections."""
        payload = json.dumps({"event": event_type, "data": data})
        for ws in list(self.active_connections.keys()):
            await self._send_payload(ws, payload)

    async def broadcast_ticket_event(
        self,
        event_type: str,
        data: dict,
        creator_id: Optional[int] = None,
        assigned_to_id: Optional[int] = None,
    ):
        """
        Sends ticket updates only to authorized users:
        - IT Staff (ADMIN, SUPPORT) receive broader workflow events.
        - Ticket creator receives updates strictly about their own ticket.
        - Assigned technician receives updates for tickets assigned to them.
        """
        payload = json.dumps({"event": event_type, "data": data})
        for ws, meta in list(self.active_connections.items()):
            user_id = meta.get("user_id")
            role = meta.get("role")

            is_staff = role in ("ADMIN", "SUPPORT")
            is_creator = creator_id is not None and user_id == creator_id
            is_assignee = assigned_to_id is not None and user_id == assigned_to_id

            if is_staff or is_creator or is_assignee:
                await self._send_payload(ws, payload)

    async def broadcast_asset_event(
        self,
        event_type: str,
        data: dict,
        target_user_id: Optional[int] = None,
    ):
        """
        Sends asset updates:
        - IT Staff (ADMIN, SUPPORT) receive all inventory changes.
        - Assigned employee receives updates when hardware is assigned/returned to them.
        """
        payload = json.dumps({"event": event_type, "data": data})
        for ws, meta in list(self.active_connections.items()):
            user_id = meta.get("user_id")
            role = meta.get("role")

            is_staff = role in ("ADMIN", "SUPPORT")
            is_target_user = target_user_id is not None and user_id == target_user_id

            if is_staff or is_target_user:
                await self._send_payload(ws, payload)


# Global singleton instance
ws_manager = ConnectionManager()
