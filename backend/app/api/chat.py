import uuid
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database import get_db
from app.models.chat import ChatMessage

router = APIRouter(prefix="/chat", tags=["Chat"])

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
async def get_chat_messages(contact_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.contact_id == str(contact_id))
        .order_by(ChatMessage.created_at.asc())
    )
    records = result.scalars().all()
    
    out = []
    for m in records:
        out.append({
            "id": m.id,
            "text": m.text or "",
            "sender": m.sender,
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
async def create_chat_message(contact_id: str, payload: SendMessageSchema, db: AsyncSession = Depends(get_db)):
    msg_id = f"msg-{uuid.uuid4().hex[:10]}"
    
    msg = ChatMessage(
        id=msg_id,
        contact_id=str(contact_id),
        text=payload.text,
        sender=payload.sender,
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
    
    return {
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
    
    return {
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

@router.delete("/message/{msg_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_message(msg_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ChatMessage).where(ChatMessage.id == str(msg_id)))
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    await db.delete(msg)
    await db.commit()
