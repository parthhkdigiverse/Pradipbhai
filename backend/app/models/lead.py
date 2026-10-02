from sqlalchemy import String, Float, Boolean, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    contact: Mapped[str] = mapped_column(String(255), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=True)
    source: Mapped[str] = mapped_column(String(100), nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Lead")
    priority: Mapped[str] = mapped_column(String(50), default="Medium")
    is_hot: Mapped[bool] = mapped_column(Boolean, default=False)
    expected_income: Mapped[float] = mapped_column(Float, default=0.0)
    created_by_user_name: Mapped[str] = mapped_column(String(255), nullable=True)
    date: Mapped[str] = mapped_column(String(50), nullable=True)
    follow_ups: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
