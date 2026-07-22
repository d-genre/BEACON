import json
import uuid
from typing import Dict, List, Set
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # Department Chat Room connections: room_id -> List[WebSocket]
        self.room_connections: Dict[str, List[WebSocket]] = {}
        # Direct Message connections: user_id -> WebSocket
        self.user_connections: Dict[str, WebSocket] = {}

    # --- Department Room WebSockets ---

    async def connect_room(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.room_connections:
            self.room_connections[room_id] = []
        self.room_connections[room_id].append(websocket)

    def disconnect_room(self, room_id: str, websocket: WebSocket):
        if room_id in self.room_connections:
            if websocket in self.room_connections[room_id]:
                self.room_connections[room_id].remove(websocket)
            if not self.room_connections[room_id]:
                del self.room_connections[room_id]

    async def broadcast_room(self, room_id: str, message_payload: dict):
        if room_id in self.room_connections:
            for connection in self.room_connections[room_id]:
                await connection.send_json(message_payload)

    # --- Direct Message WebSockets ---

    async def connect_user(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.user_connections[user_id] = websocket

    def disconnect_user(self, user_id: str):
        if user_id in self.user_connections:
            del self.user_connections[user_id]

    async def send_direct_message(self, receiver_id: str, message_payload: dict) -> bool:
        """Sends real-time message payload to receiver if online."""
        if receiver_id in self.user_connections:
            ws = self.user_connections[receiver_id]
            await ws.send_json(message_payload)
            return True
        return False


# Global Connection Manager Instance
manager = ConnectionManager()
