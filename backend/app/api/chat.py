import uuid
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_, or_, update, func

from app.database import get_db
from app.models.chat import ChatMessage
from app.api.deps import get_current_user, resolve_user_from_token

router = APIRouter(prefix="/chat", tags=["Chat"])

ADMIN_IDENTIFIERS = {"super-admin", "emp-admin", "admin@alphacreative.com", "admin@alpha.com"}

def expand_identifiers(user_or_contact_id: str, email: Optional[str] = None, role: Optional[str] = None) -> set[str]:
    ids = set()
    s_id = str(user_or_contact_id).strip()
    if s_id:
        ids.add(s_id)
    clean_email = str(email).strip().lower() if email else ""
    if clean_email:
        ids.add(clean_email)
    # Only bridge the root legacy admin IDs (super-admin, emp-admin, admin@alphacreative.com)
    # Distinct admin staff members (like Parth, Pradip, etc.) remain their own independent accounts
    if s_id in ADMIN_IDENTIFIERS or (clean_email and clean_email in ADMIN_IDENTIFIERS):
        ids.update(ADMIN_IDENTIFIERS)
    return ids

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str, aliases: Optional[set[str]] = None):
        await websocket.accept()
        resolved_aliases = aliases or expand_identifiers(user_id)
        for uid in resolved_aliases:
            if uid not in self.active_connections:
                self.active_connections[uid] = []
            if websocket not in self.active_connections[uid]:
                self.active_connections[uid].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str, aliases: Optional[set[str]] = None):
        resolved_aliases = aliases or expand_identifiers(user_id)
        for uid in resolved_aliases:
            if uid in self.active_connections:
                if websocket in self.active_connections[uid]:
                    self.active_connections[uid].remove(websocket)
                if not self.active_connections[uid]:
                    del self.active_connections[uid]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for connection in list(self.active_connections[user_id]):
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def send_to_identifiers(self, message: dict, user_ids: set[str] | list[str]):
        visited: set[int] = set()
        for uid in user_ids:
            for connection in list(self.active_connections.get(uid, [])):
                conn_id = id(connection)
                if conn_id not in visited:
                    visited.add(conn_id)
                    try:
                        await connection.send_json(message)
                    except Exception:
                        pass

    async def broadcast(self, message: dict):
        visited: set[int] = set()
        for user_id, connections in list(self.active_connections.items()):
            for connection in list(connections):
                conn_id = id(connection)
                if conn_id not in visited:
                    visited.add(conn_id)
                    try:
                        await connection.send_json(message)
                    except Exception:
                        pass

manager = ConnectionManager()

ws_router = APIRouter(prefix="/chat/ws", tags=["Chat WebSockets"])

@ws_router.websocket("/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    raw_token = (token or "").strip()
    if not raw_token:
        auth_header = websocket.headers.get("authorization", "")
        if auth_header.lower().startswith("bearer "):
            raw_token = auth_header[7:].strip()

    try:
        current_user = await resolve_user_from_token(raw_token, db)
    except HTTPException:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized")
        return

    user_aliases = expand_identifiers(
        str(getattr(current_user, "id", "")),
        getattr(current_user, "email", None),
        getattr(current_user, "role", None),
    )
    requested_id = str(user_id).strip()
    normalized_aliases = {a.lower() for a in user_aliases}
    if not requested_id or requested_id.lower() not in normalized_aliases:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Forbidden: user mismatch")
        return

    canon_id = str(getattr(current_user, "id", requested_id))
    await manager.connect(websocket, canon_id, aliases=user_aliases)
    try:
        while True:
            # We just keep the connection alive, the client doesn't need to send messages via WS
            # They use the POST API to send, which triggers push
            await websocket.receive_text()
            # Could process typing indicators here in the future
    except WebSocketDisconnect:
        manager.disconnect(websocket, canon_id, aliases=user_aliases)

class AttachmentSchema(BaseModel):
    name: str
    url: str
    type: str
    size: Optional[str] = None

class ReplyInfoSchema(BaseModel):
    id: Any
    text: str
    senderName: str

class SendMessageSchema(BaseModel):
    text: Optional[str] = ""
    sender: str = "me"
    time: Optional[str] = None
    status: Optional[str] = "sent"
    attachment: Optional[AttachmentSchema] = None
    replyTo: Optional[ReplyInfoSchema] = None

class UpdateMessageSchema(BaseModel):
    text: Optional[str] = None
    reactions: Optional[dict] = None
    isStarred: Optional[bool] = None
    isEdited: Optional[bool] = None

@router.get("/summary/recent")
async def get_recent_chat_summaries(
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    user_id = str(getattr(current_user, 'id', ''))
    user_email = str(getattr(current_user, 'email', '')).lower().strip()
    user_role = str(getattr(current_user, 'role', ''))

    my_ids = list(expand_identifiers(user_id, user_email, user_role))

    result = await db.execute(
        select(ChatMessage)
        .where(
            or_(
                ChatMessage.sender.in_(my_ids),
                ChatMessage.contact_id.in_(my_ids)
            )
        )
        .order_by(ChatMessage.created_at.desc())
        .limit(200)
    )
    records = result.scalars().all()

    # Calculate unread counts
    unread_res = await db.execute(
        select(ChatMessage.sender, func.count(ChatMessage.id))
        .where(
            and_(
                ChatMessage.contact_id.in_(my_ids),
                ChatMessage.status != "read"
            )
        )
        .group_by(ChatMessage.sender)
    )
    raw_unread_counts = {r[0]: r[1] for r in unread_res.all()}

    summary: dict = {}
    for m in records:
        other_party = m.contact_id if m.sender in my_ids else m.sender
        if other_party in ADMIN_IDENTIFIERS:
            other_party = "emp-admin"
        if other_party not in summary:
            # Aggregate unread
            unread_cnt = 0
            if other_party == "emp-admin":
                for adm_id in ADMIN_IDENTIFIERS:
                    unread_cnt += raw_unread_counts.get(adm_id, 0)
            else:
                unread_cnt = raw_unread_counts.get(other_party, 0)

            summary[other_party] = {
                "lastMessage": m.text or (m.attachment.get("name", "Attachment") if m.attachment else "Message"),
                "time": m.time or "",
                "createdAt": m.created_at.isoformat() if m.created_at else None,
                "sender": "me" if m.sender in my_ids else "them",
                "unread": unread_cnt
            }
    return summary

def _serialize_message(m: ChatMessage, my_ids: set[str] | list[str]) -> dict:
    is_me = (m.sender in my_ids) or (m.sender == "me")
    return {
        "id": m.id,
        "text": m.text or "",
        "sender": "me" if is_me else "them",
        "time": m.time,
        "createdAt": m.created_at.isoformat() if m.created_at else None,
        "status": m.status,
        "attachment": m.attachment,
        "replyTo": m.reply_to,
        "reactions": m.reactions or {},
        "isStarred": m.is_starred,
        "isForwarded": m.is_forwarded,
        "isEdited": m.is_edited,
    }


async def _mark_incoming_read_and_notify(
    db: AsyncSession,
    my_ids: list[str],
    target_ids: list[str],
    reader_id: str,
) -> None:
    try:
        res = await db.execute(
            update(ChatMessage)
            .where(
                and_(
                    ChatMessage.sender.in_(target_ids),
                    ChatMessage.contact_id.in_(my_ids),
                    ChatMessage.status != "read",
                )
            )
            .values(status="read")
        )
        if res.rowcount and res.rowcount > 0:
            await db.commit()
            await manager.send_to_identifiers(
                {"type": "messages_read", "contactId": reader_id, "altContactIds": my_ids},
                target_ids,
            )
    except Exception:
        await db.rollback()


@router.post("/{contact_id}/read")
async def mark_chat_read(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    user_id = str(getattr(current_user, "id", ""))
    user_email = str(getattr(current_user, "email", "")).lower().strip()
    user_role = str(getattr(current_user, "role", ""))

    my_ids = list(expand_identifiers(user_id, user_email, user_role))
    target_ids = list(expand_identifiers(contact_id))
    await _mark_incoming_read_and_notify(db, my_ids, target_ids, user_id or user_email)
    return {"ok": True}


@router.get("/{contact_id}")
async def get_chat_messages(
    contact_id: str, 
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    # Disable caching for real-time chat fetching
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    user_id = str(getattr(current_user, 'id', ''))
    user_email = str(getattr(current_user, 'email', '')).lower().strip()
    user_role = str(getattr(current_user, 'role', ''))

    my_ids = list(expand_identifiers(user_id, user_email, user_role))
    target_ids = list(expand_identifiers(contact_id))

    # Auto-mark incoming unread messages as read and notify sender via WS
    await _mark_incoming_read_and_notify(db, my_ids, target_ids, user_id or user_email)

    # Fetch 2-way messages strictly between current user and target contact
    result = await db.execute(
        select(ChatMessage)
        .where(
            or_(
                and_(ChatMessage.sender.in_(my_ids), ChatMessage.contact_id.in_(target_ids)),
                and_(ChatMessage.sender.in_(target_ids), ChatMessage.contact_id.in_(my_ids)),
            )
        )
        .order_by(ChatMessage.created_at.asc())
    )
    records = result.scalars().all()
    return [_serialize_message(m, my_ids) for m in records]

@router.post("/{contact_id}", status_code=status.HTTP_201_CREATED)
async def create_chat_message(
    contact_id: str, 
    payload: SendMessageSchema, 
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    msg_id = f"msg-{uuid.uuid4().hex[:10]}"
    user_id = str(getattr(current_user, 'id', ''))
    user_email = str(getattr(current_user, 'email', '')).lower().strip()
    user_role = str(getattr(current_user, 'role', ''))

    sender_id = user_id or user_email
    my_ids = list(expand_identifiers(user_id, user_email, user_role))
    target_ids = list(expand_identifiers(contact_id))
    
    msg = ChatMessage(
        id=msg_id,
        contact_id=str(contact_id),
        text=payload.text,
        sender=sender_id,
        time=payload.time,
        status=payload.status or "sent",
        attachment=payload.attachment.model_dump() if payload.attachment else None,
        reply_to=payload.replyTo.model_dump() if payload.replyTo else None,
        reactions={},
        is_starred=False,
        is_forwarded=False,
        is_edited=False
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    
    msg_dict = {
        "id": msg.id,
        "text": msg.text or "",
        "sender": "them", # From the perspective of the receiver
        "time": msg.time,
        "createdAt": msg.created_at.isoformat() if msg.created_at else None,
        "status": msg.status,
        "attachment": msg.attachment,
        "replyTo": msg.reply_to,
        "reactions": msg.reactions or {},
        "isStarred": msg.is_starred,
        "isForwarded": msg.is_forwarded,
        "isEdited": msg.is_edited
    }
    
    # Notify target user via websocket (deduplicated across aliases)
    await manager.send_to_identifiers(
        {"type": "new_message", "contactId": sender_id, "altContactIds": my_ids, "message": msg_dict},
        target_ids,
    )
    
    # Also notify other tabs of the sender
    msg_dict_me = {**msg_dict, "sender": "me"}
    await manager.send_to_identifiers(
        {"type": "new_message", "contactId": str(contact_id), "altContactIds": target_ids, "message": msg_dict_me},
        my_ids,
    )

    return msg_dict_me

@router.put("/message/{msg_id}")
async def update_chat_message(
    msg_id: str,
    payload: UpdateMessageSchema,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    result = await db.execute(select(ChatMessage).where(ChatMessage.id == str(msg_id)))
    msg = result.scalar_one_or_none()
    
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    user_id = str(getattr(current_user, "id", ""))
    user_email = str(getattr(current_user, "email", "")).lower().strip()
    user_role = str(getattr(current_user, "role", ""))
    my_ids = expand_identifiers(user_id, user_email, user_role)

    sender_aliases = expand_identifiers(msg.sender)
    contact_aliases = expand_identifiers(str(msg.contact_id))

    is_sender = msg.sender in my_ids or bool(my_ids & sender_aliases)
    is_participant = is_sender or (str(msg.contact_id) in my_ids) or bool(my_ids & contact_aliases)

    if not is_participant:
        raise HTTPException(status_code=403, detail="Not authorized to update this message")
    if payload.text is not None and not is_sender:
        raise HTTPException(status_code=403, detail="Only the sender can edit a message")
        
    if payload.text is not None:
        msg.text = payload.text
        msg.is_edited = True
    if payload.reactions is not None:
        msg.reactions = payload.reactions
    if payload.isStarred is not None:
        msg.is_starred = payload.isStarred

    await db.commit()
    await db.refresh(msg)
    
    base_dict = {
        "id": msg.id,
        "text": msg.text or "",
        "time": msg.time,
        "createdAt": msg.created_at.isoformat() if msg.created_at else None,
        "status": msg.status,
        "attachment": msg.attachment,
        "replyTo": msg.reply_to,
        "reactions": msg.reactions or {},
        "isStarred": msg.is_starred,
        "isForwarded": msg.is_forwarded,
        "isEdited": msg.is_edited,
    }
    
    msg_for_sender = {**base_dict, "sender": "me"}
    msg_for_receiver = {**base_dict, "sender": "them"}

    # Send perspective-accurate updates to receiver & sender tabs
    await manager.send_to_identifiers(
        {
            "type": "update_message",
            "contactId": msg.sender,
            "altContactIds": list(sender_aliases),
            "message": msg_for_receiver,
        },
        contact_aliases,
    )
    await manager.send_to_identifiers(
        {
            "type": "update_message",
            "contactId": str(msg.contact_id),
            "altContactIds": list(contact_aliases),
            "message": msg_for_sender,
        },
        sender_aliases,
    )

    return msg_for_sender if is_sender else msg_for_receiver

@router.delete("/message/{msg_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_message(
    msg_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    result = await db.execute(select(ChatMessage).where(ChatMessage.id == str(msg_id)))
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    user_id = str(getattr(current_user, "id", ""))
    user_email = str(getattr(current_user, "email", "")).lower().strip()
    user_role = str(getattr(current_user, "role", ""))
    my_ids = expand_identifiers(user_id, user_email, user_role)

    sender_aliases = expand_identifiers(msg.sender)
    if msg.sender not in my_ids and not (my_ids & sender_aliases):
        raise HTTPException(status_code=403, detail="Only the sender can delete this message")
        
    sender = msg.sender
    contact_id = str(msg.contact_id)
    contact_aliases = expand_identifiers(contact_id)
    
    await db.delete(msg)
    await db.commit()
    
    # Notify both participants of deletion
    await manager.send_to_identifiers(
        {"type": "delete_message", "contactId": sender, "altContactIds": list(sender_aliases), "messageId": msg_id},
        contact_aliases,
    )
    await manager.send_to_identifiers(
        {"type": "delete_message", "contactId": contact_id, "altContactIds": list(contact_aliases), "messageId": msg_id},
        sender_aliases,
    )
