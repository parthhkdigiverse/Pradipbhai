from typing import Optional, Any
from sqlalchemy import String, Float, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    client_id: Mapped[str] = mapped_column(String(50), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="Designing")
    status: Mapped[str] = mapped_column(String(50), default="Planning")
    budget: Mapped[float] = mapped_column(Float, default=0.0)
    deadline: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    product_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    content_calendar: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    client = relationship("Client", back_populates="projects")
