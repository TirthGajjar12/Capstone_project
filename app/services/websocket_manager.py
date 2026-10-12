import json
from typing import List
from fastapi import WebSocket

class ConnectionManager: #A class that keeps track of every browser tab currently connected to your app.
    """
    Singleton-style in-memory WebSocket manager.
    Tracks all actively connected clients and broadcasts real-time events.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, event_type: str, data: dict):
        """Broadcasts a JSON event payload to all connected clients."""
        payload = json.dumps({"event": event_type, "data": data})
        # Iterate over a copy in case a connection drops during send
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                self.disconnect(connection)

# Global singleton instance
ws_manager = ConnectionManager()
