from sqlalchemy import String, DateTime, JSON, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    contact_id: Mapped[int] = mapped_column(String(50), nullable=False)
    text: Mapped[str] = mapped_column(String(2000), nullable=True)
    sender: Mapped[str] = mapped_column(String(20), nullable=False) # "me" | "them"
    time: Mapped[str] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="sent") # "sent", "delivered", "read"
    attachment: Mapped[dict] = mapped_column(JSON, nullable=True) # { name, url, type, size }
    reply_to: Mapped[dict] = mapped_column(JSON, nullable=True) # { id, text, senderName }
    reactions: Mapped[dict] = mapped_column(JSON, nullable=True) # { emoji: [users] }
    is_starred: Mapped[bool] = mapped_column(Boolean, default=False)
    is_forwarded: Mapped[bool] = mapped_column(Boolean, default=False)
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
