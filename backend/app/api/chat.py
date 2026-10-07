import uuid
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Response, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_, or_

from app.database import get_db
from app.models.chat import ChatMessage
from app.api.deps import get_current_user

router = APIRouter(prefix="/chat", tags=["Chat"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

manager = ConnectionManager()

ws_router = APIRouter(prefix="/chat/ws", tags=["Chat WebSockets"])

@ws_router.websocket("/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            # We just keep the connection alive, the client doesn't need to send messages via WS
            # They use the POST API to send, which triggers push
            data = await websocket.receive_text()
            # Could process typing indicators here in the future
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

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
    user_id = str(getattr(current_user, 'id', '')) or str(getattr(current_user, 'email', ''))
    user_email = str(getattr(current_user, 'email', ''))
    target_id = str(contact_id)

    # Fetch 2-way messages between current user and target contact
    result = await db.execute(
        select(ChatMessage)
        .where(
            or_(
                and_(ChatMessage.sender == user_id, ChatMessage.contact_id == target_id),
                and_(ChatMessage.sender == target_id, ChatMessage.contact_id == user_id),
                and_(ChatMessage.sender == user_email, ChatMessage.contact_id == target_id),
                and_(ChatMessage.sender == target_id, ChatMessage.contact_id == user_email),
                # Legacy compatibility fallback
                and_(ChatMessage.contact_id == target_id, ChatMessage.sender.in_(["me", "them"]))
            )
        )
        .order_by(ChatMessage.created_at.asc())
    )
    records = result.scalars().all()
    
    out = []
    for m in records:
        is_me = (m.sender == user_id) or (m.sender == user_email) or (m.sender == "me")
        out.append({
            "id": m.id,
            "text": m.text or "",
            "sender": "me" if is_me else "them",
            "time": m.time,
            "status": m.status,
            "attachment": m.attachment,
            "replyTo": m.reply_to,
            "reactions": m.reactions or {},
            "isStarred": m.is_starred,
            "isForwarded": m.is_forwarded,
            "isEdited": m.is_edited
        })
    return out

@router.post("/{contact_id}", status_code=status.HTTP_201_CREATED)
async def create_chat_message(
    contact_id: str, 
    payload: SendMessageSchema, 
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    msg_id = f"msg-{uuid.uuid4().hex[:10]}"
    sender_id = str(getattr(current_user, 'id', '')) or str(getattr(current_user, 'email', ''))
    
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
        "text": msg.text,
        "sender": "them", # From the perspective of the receiver
        "time": msg.time,
        "status": msg.status,
        "attachment": msg.attachment,
        "replyTo": msg.reply_to,
        "reactions": msg.reactions or {},
        "isStarred": msg.is_starred,
        "isForwarded": msg.is_forwarded,
        "isEdited": msg.is_edited
    }
    
    # Notify target user via websocket
    await manager.send_personal_message({"type": "new_message", "contactId": sender_id, "message": msg_dict}, str(contact_id))
    
    # Also notify other tabs of the sender
    msg_dict_me = {**msg_dict, "sender": "me"}
    await manager.send_personal_message({"type": "new_message", "contactId": str(contact_id), "message": msg_dict_me}, sender_id)

    return msg_dict_me

@router.put("/message/{msg_id}")
async def update_chat_message(msg_id: str, payload: UpdateMessageSchema, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ChatMessage).where(ChatMessage.id == str(msg_id)))
    msg = result.scalar_one_or_none()
    
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    if payload.text is not None:
        msg.text = payload.text
        msg.is_edited = True
    if payload.reactions is not None:
        msg.reactions = payload.reactions
    if payload.isStarred is not None:
        msg.is_starred = payload.isStarred

    await db.commit()
    await db.refresh(msg)
    
    msg_dict = {
        "id": msg.id,
        "text": msg.text,
        "sender": msg.sender,
        "time": msg.time,
        "status": msg.status,
        "attachment": msg.attachment,
        "replyTo": msg.reply_to,
        "reactions": msg.reactions or {},
        "isStarred": msg.is_starred,
        "isForwarded": msg.is_forwarded,
        "isEdited": msg.is_edited
    }
    
    # Send update to both participants
    await manager.send_personal_message({"type": "update_message", "contactId": msg.sender, "message": msg_dict}, str(msg.contact_id))
    await manager.send_personal_message({"type": "update_message", "contactId": str(msg.contact_id), "message": msg_dict}, msg.sender)

    return msg_dict

@router.delete("/message/{msg_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_message(msg_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ChatMessage).where(ChatMessage.id == str(msg_id)))
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    sender = msg.sender
    contact_id = str(msg.contact_id)
    
    await db.delete(msg)
    await db.commit()
    
    # Notify both participants of deletion
    await manager.send_personal_message({"type": "delete_message", "contactId": sender, "messageId": msg_id}, contact_id)
    await manager.send_personal_message({"type": "delete_message", "contactId": contact_id, "messageId": msg_id}, sender)
