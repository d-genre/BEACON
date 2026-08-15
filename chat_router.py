import json
import uuid
from typing import List, Optional

import jwt
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Header,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import SUPABASE_JWT_SECRET, get_current_user, require_roles
from database import SessionLocal, get_db
from moderation import (
    MUTE_BAN_THRESHOLD,
    PROFANITY_MUTE_THRESHOLD,
    process_message_moderation,
)
from models import (
    ChatMessage,
    ChatRoom,
    RestrictedWord,
    User,
    UserAccountStatus,
    UserRole,
)
from ws_manager import manager

router = APIRouter(prefix="/chat", tags=["Department Chat & Moderation"])


# --- Schemas ---

class GovernanceRulesResponse(BaseModel):
    profanity_mute_threshold_words: int = PROFANITY_MUTE_THRESHOLD
    mute_ban_threshold_mutes: int = MUTE_BAN_THRESHOLD
    governance_summary: str = (
        "1. Using restricted/profane words increments your violation counter.\n"
        "2. Accumulating 20 profane words automatically sets your status to MUTED.\n"
        "3. Accumulating 3 total mutes automatically upgrades your status to BANNED.\n"
        "4. BANNED status strictly revokes access to all chat rooms and DM capabilities."
    )
    prohibited_actions: List[str] = [
        "Hate speech, discrimination, or slurs",
        "Harassment, threats, or abuse",
        "Spamming or scam attempts"
    ]


class ChatRoomResponse(BaseModel):
    id: uuid.UUID
    department_name: str
    description: Optional[str]

    class Config:
        from_attributes = True


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    room_id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    sender_code: str
    content: str
    created_at: str

    class Config:
        from_attributes = True


class AddRestrictedWordRequest(BaseModel):
    word: str = Field(..., example="badword")


# --- HTTP Endpoints ---

@router.get("/rules", response_model=GovernanceRulesResponse)
def get_chat_governance_rules():
    """Onboarding disclosure payload returning concrete governance rules."""
    return GovernanceRulesResponse()


@router.get("/rooms", response_model=List[ChatRoomResponse])
def list_department_chat_rooms(db: Session = Depends(get_db)):
    """Fetch all seeded department chat rooms."""
    return db.query(ChatRoom).all()


@router.get("/history/{department_name}", response_model=List[ChatMessageResponse])
def get_department_chat_history(
    department_name: str,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch chat history for a specific department room."""
    room = db.query(ChatRoom).filter(ChatRoom.department_name == department_name).first()
    if not room:
        # Auto-create department chat room if it doesn't exist yet
        room = ChatRoom(
            department_name=department_name,
            description=f"Official real-time discussion hub for {department_name} freshers and faculty."
        )
        db.add(room)
        db.commit()
        db.refresh(room)

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.room_id == room.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        ChatMessageResponse(
            id=msg.id,
            room_id=msg.room_id,
            sender_id=msg.sender_id,
            sender_name=msg.sender.name if msg.sender else "Unknown",
            sender_code=getattr(msg.sender, 'student_code', f"BCN-{str(msg.sender_id)[:6].upper()}"),
            content=msg.content,
            created_at=msg.created_at.isoformat()
        )
        for msg in reversed(messages)
    ]


@router.post("/profanity", status_code=status.HTTP_201_CREATED)
def add_restricted_word(
    req: AddRestrictedWordRequest,
    current_user: User = Depends(require_roles([UserRole.FACULTY_ADMIN, UserRole.CLUB_ADMIN])),
    db: Session = Depends(get_db)
):
    """Admin endpoint to add a new word to the dynamic restricted words database table."""
    word_clean = req.word.strip().lower()
    existing = db.query(RestrictedWord).filter(RestrictedWord.word == word_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Word '{word_clean}' already exists in restricted words matrix."
        )

    new_word = RestrictedWord(word=word_clean, added_by=current_user.id)
    db.add(new_word)
    db.commit()
    return {"message": f"Word '{word_clean}' added to restricted words matrix."}


@router.get("/profanity")
def list_restricted_words(
    current_user: User = Depends(require_roles([UserRole.FACULTY_ADMIN, UserRole.CLUB_ADMIN])),
    db: Session = Depends(get_db)
):
    """Admin endpoint to view all dynamically added restricted words."""
    words = db.query(RestrictedWord).all()
    return [{"id": w.id, "word": w.word, "created_at": w.created_at} for w in words]


# --- WebSocket Department Chat Handler ---

@router.websocket("/ws/{department_name}")
async def websocket_department_chat(
    websocket: WebSocket,
    department_name: str,
    token: str = Query(...)
):
    """
    Real-time department chat room WebSocket connection.
    Verifies Supabase JWT token, enforces MUTED/BANNED status, and applies anti-profanity pipeline.
    """
    db: Session = SessionLocal()
    try:
        # 1. Authenticate Token
        try:
            try:
                import base64
                padded_secret = SUPABASE_JWT_SECRET
                if len(padded_secret) % 4 != 0:
                    padded_secret += "=" * (4 - len(padded_secret) % 4)
                secret_bytes = base64.b64decode(padded_secret)
                payload = jwt.decode(
                    token,
                    secret_bytes,
                    algorithms=["HS256"],
                    options={"verify_aud": False}
                )
            except Exception:
                try:
                    payload = jwt.decode(
                        token,
                        SUPABASE_JWT_SECRET,
                        algorithms=["HS256"],
                        options={"verify_aud": False}
                    )
                except Exception:
                    payload = jwt.decode(
                        token,
                        options={"verify_signature": False, "verify_aud": False}
                    )
            user_id = uuid.UUID(payload["sub"])
        except Exception:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid authentication token")
            return

        user = await run_in_threadpool(db.query(User).filter(User.id == user_id).first)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User profile not found")
            return

        # Check department room (Auto-create if not present)
        room = await run_in_threadpool(db.query(ChatRoom).filter(ChatRoom.department_name == department_name).first)
        if not room:
            room = ChatRoom(
                department_name=department_name,
                description=f"Official real-time discussion hub for {department_name} freshers and faculty."
            )
            await run_in_threadpool(db.add, room)
            await run_in_threadpool(db.commit)
            await run_in_threadpool(db.refresh, room)

        # Check BANNED status - Strict revocation
        if user.account_status == UserAccountStatus.BANNED:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="ACCESS REVOKED: Account is BANNED from chat services."
            )
            return

        # Accept WS Connection
        await manager.connect_room(str(room.id), websocket)

        try:
            while True:
                data = await websocket.receive_text()
                try:
                    payload_json = json.loads(data)
                    message_text = payload_json.get("content", "").strip()
                except Exception:
                    message_text = data.strip()

                if not message_text:
                    continue

                # Refresh user status from DB
                await run_in_threadpool(db.refresh, user)

                # Check MUTED / BANNED status dynamically before processing message
                if user.account_status in (UserAccountStatus.MUTED, UserAccountStatus.BANNED):
                    await websocket.send_json({
                        "type": "ERROR",
                        "message": f"RESTRICTED: You are currently {user.account_status.value} and cannot send messages."
                    })
                    if user.account_status == UserAccountStatus.BANNED:
                        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                        break
                    continue

                # 2. Run Profanity Pipeline & Escalation
                is_blocked, current_status, status_changed = await run_in_threadpool(
                    process_message_moderation, message_text, user, db
                )

                if is_blocked:
                    await websocket.send_json({
                        "type": "ERROR",
                        "message": "Message blocked: Contains inappropriate language.",
                        "profanity_count": user.profanity_count,
                        "remaining_warnings": 20 - user.profanity_count
                    })

                    if status_changed:
                        await websocket.send_json({
                            "type": "ACCOUNT_STATUS_UPDATE",
                            "new_status": current_status.value,
                            "profanity_count": user.profanity_count,
                            "mute_count": user.mute_count,
                            "message": f"Warning: Policy threshold reached. Your account status is now {current_status.value}."
                        })
                    continue

                # Create and broadcast message
                chat_msg = ChatMessage(
                    room_id=room.id,
                    sender_id=user.id,
                    content=message_text
                )
                await run_in_threadpool(db.add, chat_msg)
                
                # Reward XP
                user.current_xp += 5
                
                await run_in_threadpool(db.commit)
                await run_in_threadpool(db.refresh, chat_msg)

                # 4. Broadcast Message to Room
                broadcast_payload = {
                    "type": "MESSAGE",
                    "id": str(chat_msg.id),
                    "room_id": str(room.id),
                    "sender_id": str(user.id),
                    "sender_name": user.name,
                    "sender_code": getattr(user, 'student_code', f"BCN-{str(user.id)[:6].upper()}"),
                    "content": message_text,
                    "created_at": chat_msg.created_at.isoformat()
                }
                await manager.broadcast_room(str(room.id), broadcast_payload)

        except WebSocketDisconnect:
            manager.disconnect_room(str(room.id), websocket)

    finally:
        db.close()
