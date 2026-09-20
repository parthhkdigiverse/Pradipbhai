from sqlalchemy import String, Float, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Staff(Base):
    __tablename__ = "staff"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(100), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Active")
    join_date: Mapped[str] = mapped_column(String(50), nullable=True)
    base_salary: Mapped[float] = mapped_column(Float, default=0.0)
    password: Mapped[str] = mapped_column(String(255), nullable=True)
    permissions: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
