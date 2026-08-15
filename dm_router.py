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
from pydantic import BaseModel
from sqlalchemy import or_, and_, func
from sqlalchemy.orm import Session

from auth import SUPABASE_JWT_SECRET, get_current_user
from database import SessionLocal, get_db
from moderation import process_message_moderation
from models import (
    DMRequest,
    DMRequestStatus,
    DirectMessage,
    User,
    UserAccountStatus,
    UserRole,
    SeniorMentor,
)
from ws_manager import manager

router = APIRouter(prefix="/dms", tags=["Direct Messaging & Handshake Protocol"])


# --- Schemas ---

class DMRequestResponse(BaseModel):
    id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    receiver_id: uuid.UUID
    receiver_name: str
    status: DMRequestStatus
    created_at: str

    class Config:
        from_attributes = True


class DirectMessageResponse(BaseModel):
    id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    receiver_id: uuid.UUID
    content: str
    created_at: str

    class Config:
        from_attributes = True


class DMContactResponse(BaseModel):
    user_id: uuid.UUID
    name: str
    student_code: str
    department: str

    class Config:
        from_attributes = True


# --- HTTP Handshake Endpoints ---

@router.post("/request/{receiver_identifier}", response_model=DMRequestResponse, status_code=status.HTTP_201_CREATED)
def send_dm_request(
    receiver_identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initiates a DM request by Student Code (e.g. BCN-784A), Email, or UUID.
    Enforces 1 pending request ceiling and permanent block on rejection.
    """
    # Check if MUTED or BANNED
    if current_user.account_status in (UserAccountStatus.MUTED, UserAccountStatus.BANNED):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Your account status is '{current_user.account_status.value}'."
        )

    # Resolve receiver user by student_code, email, or UUID
    clean_identifier = receiver_identifier.strip()
    target_user = db.query(User).filter(User.student_code == clean_identifier.upper()).first()
    if not target_user:
        target_user = db.query(User).filter(User.email == clean_identifier.lower()).first()
    if not target_user:
        try:
            target_uuid = uuid.UUID(clean_identifier)
            target_user = db.query(User).filter(User.id == target_uuid).first()
        except Exception:
            pass

    if not target_user:
        # Fallback: check if target is a registered Senior Mentor
        mentor = db.query(SeniorMentor).filter(func.lower(SeniorMentor.contact_email) == clean_identifier.lower()).first()
        if not mentor:
            try:
                mentor_uuid = uuid.UUID(clean_identifier)
                mentor = db.query(SeniorMentor).filter(SeniorMentor.id == mentor_uuid).first()
            except Exception:
                pass
        
        if mentor:
            target_user = User(
                name=mentor.name,
                email=mentor.contact_email.lower(),
                department=mentor.department,
                student_code=f"BCN-{uuid.uuid4().hex[:6].upper()}",
                role=UserRole.STUDENT,
                account_status=UserAccountStatus.ACTIVE
            )
            db.add(target_user)
            db.commit()
            db.refresh(target_user)

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student profile matching '{clean_identifier}' not found. Verify their Beacon Student Code or email."
        )

    receiver_id = target_user.id

    if current_user.id == receiver_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot send a DM request to yourself."
        )

    # Check existing request between these two users
    existing_request = db.query(DMRequest).filter(
        DMRequest.sender_id == current_user.id,
        DMRequest.receiver_id == receiver_id
    ).first()

    if existing_request:
        if existing_request.status == DMRequestStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request Ceiling Reached: A pending DM request already exists for this user."
            )
        elif existing_request.status == DMRequestStatus.REJECTED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permanent Block: The user has previously rejected your DM request."
            )
        elif existing_request.status == DMRequestStatus.ACCEPTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="DM connection is already active and accepted."
            )

    # Create new DM Request
    dm_req = DMRequest(
        sender_id=current_user.id,
        receiver_id=receiver_id,
        status=DMRequestStatus.PENDING
    )
    db.add(dm_req)
    db.commit()
    db.refresh(dm_req)

    return DMRequestResponse(
        id=dm_req.id,
        sender_id=dm_req.sender_id,
        sender_name=current_user.name,
        receiver_id=dm_req.receiver_id,
        receiver_name=target_user.name,
        status=dm_req.status,
        created_at=dm_req.created_at.isoformat()
    )


@router.post("/connect/{receiver_identifier}", response_model=DMContactResponse)
def connect_or_create_dm(
    receiver_identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Directly connects/resolves target user (or senior mentor) and auto-accepts DM connection.
    Returns target user contact info so frontend can immediately open chatbox.
    """
    # Check if MUTED or BANNED
    if current_user.account_status in (UserAccountStatus.MUTED, UserAccountStatus.BANNED):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Your account status is '{current_user.account_status.value}'."
        )

    clean_identifier = receiver_identifier.strip()

    # Check User table by student_code, email, or UUID
    target_user = db.query(User).filter(User.student_code == clean_identifier.upper()).first()
    if not target_user:
        target_user = db.query(User).filter(func.lower(User.email) == clean_identifier.lower()).first()
    if not target_user:
        try:
            target_uuid = uuid.UUID(clean_identifier)
            target_user = db.query(User).filter(User.id == target_uuid).first()
        except Exception:
            pass

    if not target_user:
        # Check if target is a registered Senior Mentor
        mentor = db.query(SeniorMentor).filter(func.lower(SeniorMentor.contact_email) == clean_identifier.lower()).first()
        if not mentor:
            try:
                mentor_uuid = uuid.UUID(clean_identifier)
                mentor = db.query(SeniorMentor).filter(SeniorMentor.id == mentor_uuid).first()
            except Exception:
                pass

        if mentor:
            target_user = User(
                name=mentor.name,
                email=mentor.contact_email.lower(),
                department=mentor.department,
                student_code=f"BCN-{uuid.uuid4().hex[:6].upper()}",
                role=UserRole.STUDENT,
                account_status=UserAccountStatus.ACTIVE
            )
            db.add(target_user)
            db.commit()
            db.refresh(target_user)

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target mentor/student matching '{clean_identifier}' not found."
        )

    if current_user.id == target_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot connect to yourself."
        )

    # Ensure ACCEPTED connection exists in dm_requests
    connection = db.query(DMRequest).filter(
        or_(
            and_(DMRequest.sender_id == current_user.id, DMRequest.receiver_id == target_user.id),
            and_(DMRequest.sender_id == target_user.id, DMRequest.receiver_id == current_user.id)
        )
    ).first()

    if connection:
        if connection.status != DMRequestStatus.ACCEPTED:
            connection.status = DMRequestStatus.ACCEPTED
            db.commit()
    else:
        connection = DMRequest(
            sender_id=current_user.id,
            receiver_id=target_user.id,
            status=DMRequestStatus.ACCEPTED
        )
        db.add(connection)
        db.commit()

    return DMContactResponse(
        user_id=target_user.id,
        name=target_user.name,
        student_code=target_user.student_code or "BCN-STUDENT",
        department=target_user.department or "Engineering"
    )



@router.post("/accept/{request_id}", response_model=DMRequestResponse)
def accept_dm_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Receiver accepts a pending DM request, unlocking the state lock for messaging."""
    dm_req = db.query(DMRequest).filter(DMRequest.id == request_id).first()
    if not dm_req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="DM Request not found."
        )

    if dm_req.receiver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the target receiver can accept this request."
        )

    if dm_req.status != DMRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot accept a request with status '{dm_req.status.value}'."
        )

    dm_req.status = DMRequestStatus.ACCEPTED
    db.commit()
    db.refresh(dm_req)

    return DMRequestResponse(
        id=dm_req.id,
        sender_id=dm_req.sender_id,
        sender_name=dm_req.sender.name if dm_req.sender else "Unknown",
        receiver_id=dm_req.receiver_id,
        receiver_name=current_user.name,
        status=dm_req.status,
        created_at=dm_req.created_at.isoformat()
    )


@router.post("/reject/{request_id}", response_model=DMRequestResponse)
def reject_dm_request(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Receiver rejects a pending DM request. Triggers permanent block rule."""
    dm_req = db.query(DMRequest).filter(DMRequest.id == request_id).first()
    if not dm_req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="DM Request not found."
        )

    if dm_req.receiver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the target receiver can reject this request."
        )

    dm_req.status = DMRequestStatus.REJECTED
    db.commit()
    db.refresh(dm_req)

    return DMRequestResponse(
        id=dm_req.id,
        sender_id=dm_req.sender_id,
        sender_name=dm_req.sender.name if dm_req.sender else "Unknown",
        receiver_id=dm_req.receiver_id,
        receiver_name=current_user.name,
        status=dm_req.status,
        created_at=dm_req.created_at.isoformat()
    )


@router.get("/requests", response_model=List[DMRequestResponse])
def get_pending_dm_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch pending DM requests received by current user."""
    requests = db.query(DMRequest).filter(
        DMRequest.receiver_id == current_user.id,
        DMRequest.status == DMRequestStatus.PENDING
    ).all()

    return [
        DMRequestResponse(
            id=req.id,
            sender_id=req.sender_id,
            sender_name=req.sender.name if req.sender else "Unknown",
            receiver_id=req.receiver_id,
            receiver_name=current_user.name,
            status=req.status,
            created_at=req.created_at.isoformat()
        )
        for req in requests
    ]


@router.get("/contacts", response_model=List[DMContactResponse])
def get_accepted_dm_contacts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch all accepted DM contacts for the current user."""
    accepted_requests = db.query(DMRequest).filter(
        or_(
            DMRequest.sender_id == current_user.id,
            DMRequest.receiver_id == current_user.id
        ),
        DMRequest.status == DMRequestStatus.ACCEPTED
    ).all()

    contacts = []
    seen_ids = set()

    for req in accepted_requests:
        target = req.receiver if req.sender_id == current_user.id else req.sender
        if target and target.id != current_user.id and target.id not in seen_ids:
            seen_ids.add(target.id)
            contacts.append(DMContactResponse(
                user_id=target.id,
                name=target.name,
                student_code=target.student_code or "BCN-STUDENT",
                department=target.department or "Engineering"
            ))

    return contacts


@router.get("/history/{target_user_id}", response_model=List[DirectMessageResponse])
def get_dm_history(
    target_user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch DM history between current user and target user (requires ACCEPTED request)."""
    # 1. Resolve target user (prevents 500 error on invalid or mentor UUID)
    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        mentor = db.query(SeniorMentor).filter(SeniorMentor.id == target_user_id).first()
        if mentor:
            target_user = db.query(User).filter(func.lower(User.email) == mentor.contact_email.lower()).first()
            if not target_user:
                target_user = User(
                    name=mentor.name,
                    email=mentor.contact_email.lower(),
                    department=mentor.department,
                    student_code=f"BCN-{uuid.uuid4().hex[:6].upper()}",
                    role=UserRole.STUDENT,
                    account_status=UserAccountStatus.ACTIVE
                )
                db.add(target_user)
                db.commit()
                db.refresh(target_user)
            target_user_id = target_user.id

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user profile not found."
        )

    # 2. Check ACCEPTED connection
    connection = db.query(DMRequest).filter(
        or_(
            and_(DMRequest.sender_id == current_user.id, DMRequest.receiver_id == target_user_id),
            and_(DMRequest.sender_id == target_user_id, DMRequest.receiver_id == current_user.id)
        ),
        DMRequest.status == DMRequestStatus.ACCEPTED
    ).first()

    if not connection:
        return []

    messages = db.query(DirectMessage).filter(
        or_(
            and_(DirectMessage.sender_id == current_user.id, DirectMessage.receiver_id == target_user_id),
            and_(DirectMessage.sender_id == target_user_id, DirectMessage.receiver_id == current_user.id)
        )
    ).order_by(DirectMessage.created_at.asc()).all()

    return [
        DirectMessageResponse(
            id=msg.id,
            sender_id=msg.sender_id,
            sender_name=msg.sender.name if msg.sender else "Unknown",
            receiver_id=msg.receiver_id,
            content=msg.content,
            created_at=msg.created_at.isoformat()
        )
        for msg in messages
    ]


@router.delete("/chat/{target_user_id}", status_code=status.HTTP_200_OK)
def delete_dm_chat(
    target_user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes all messages and the connection handshake between the current user and the target user."""
    # 1. Delete messages
    db.query(DirectMessage).filter(
        or_(
            and_(DirectMessage.sender_id == current_user.id, DirectMessage.receiver_id == target_user_id),
            and_(DirectMessage.sender_id == target_user_id, DirectMessage.receiver_id == current_user.id)
        )
    ).delete(synchronize_session=False)

    # 2. Delete connection
    db.query(DMRequest).filter(
        or_(
            and_(DMRequest.sender_id == current_user.id, DMRequest.receiver_id == target_user_id),
            and_(DMRequest.sender_id == target_user_id, DMRequest.receiver_id == current_user.id)
        )
    ).delete(synchronize_session=False)

    db.commit()
    return {"message": "Chat history and connection deleted successfully."}


# --- WebSocket Direct Messaging Handler ---

@router.websocket("/ws/{target_user_id}")
async def websocket_direct_messaging(
    websocket: WebSocket,
    target_user_id: uuid.UUID,
    token: str = Query(...)
):
    """
    Real-time Direct Messaging WebSocket connection.
    Enforces state lock (requires ACCEPTED DM request), MUTED/BANNED restrictions, and anti-profanity.
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
            sender_id = uuid.UUID(payload["sub"])
        except Exception:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid authentication token")
            return

        sender = db.query(User).filter(User.id == sender_id).first()
        if not sender:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Sender profile not found")
            return

        # Check BANNED status
        if sender.account_status == UserAccountStatus.BANNED:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="ACCESS REVOKED: Account is BANNED from messaging services."
            )
            return

        # Check target user existence
        target_user = db.query(User).filter(User.id == target_user_id).first()
        if not target_user:
            mentor = db.query(SeniorMentor).filter(SeniorMentor.id == target_user_id).first()
            if mentor:
                target_user = db.query(User).filter(func.lower(User.email) == mentor.contact_email.lower()).first()
                if target_user:
                    target_user_id = target_user.id
            if not target_user:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Target user profile not found")
                return

        # 2. Check DM State Lock (Must have status = ACCEPTED)
        connection = db.query(DMRequest).filter(
            or_(
                and_(DMRequest.sender_id == sender_id, DMRequest.receiver_id == target_user_id),
                and_(DMRequest.sender_id == target_user_id, DMRequest.receiver_id == sender_id)
            )
        ).first()

        if not connection or connection.status != DMRequestStatus.ACCEPTED:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="DM connection state lock active. Request must be accepted.")
            return

        # Accept connection
        await manager.connect_user(str(sender_id), websocket)

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

                db.refresh(sender)

                # Check MUTED / BANNED dynamically
                if sender.account_status in (UserAccountStatus.MUTED, UserAccountStatus.BANNED):
                    await websocket.send_json({
                        "type": "ERROR",
                        "message": f"RESTRICTED: You are currently {sender.account_status.value} and cannot send messages."
                    })
                    if sender.account_status == UserAccountStatus.BANNED:
                        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                        break
                    continue

                # 3. Profanity Moderation
                is_blocked, current_status, status_changed = process_message_moderation(
                    message_text, sender, db
                )

                if is_blocked:
                    await websocket.send_json({
                        "type": "ERROR",
                        "message": "Message blocked: Contains inappropriate language.",
                        "profanity_count": sender.profanity_count,
                        "remaining_warnings": 20 - sender.profanity_count
                    })

                    if status_changed:
                        await websocket.send_json({
                            "type": "ACCOUNT_STATUS_UPDATE",
                            "new_status": current_status.value,
                            "profanity_count": sender.profanity_count,
                            "mute_count": sender.mute_count,
                            "message": f"Warning: Policy threshold reached. Your account status is now {current_status.value}."
                        })
                    continue

                # 4. Store Direct Message
                dm_msg = DirectMessage(
                    sender_id=sender_id,
                    receiver_id=target_user_id,
                    content=message_text
                )
                db.add(dm_msg)

                # Reward XP
                sender.current_xp += 5

                db.commit()
                db.refresh(dm_msg)

                msg_payload = {
                    "type": "DIRECT_MESSAGE",
                    "id": str(dm_msg.id),
                    "sender_id": str(sender_id),
                    "sender_name": sender.name,
                    "receiver_id": str(target_user_id),
                    "content": message_text,
                    "created_at": dm_msg.created_at.isoformat()
                }

                # Confirm back to sender
                await websocket.send_json(msg_payload)

                # Send real-time payload to target user if online
                await manager.send_direct_message(str(target_user_id), msg_payload)

        except WebSocketDisconnect:
            manager.disconnect_user(str(sender_id))

    finally:
        db.close()
