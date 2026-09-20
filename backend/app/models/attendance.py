from sqlalchemy import String, Float, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    staff_id: Mapped[str] = mapped_column(String(50), nullable=True)
    staff_name: Mapped[str] = mapped_column(String(255), nullable=False)
    date: Mapped[str] = mapped_column(String(50), nullable=False)
    check_in: Mapped[str] = mapped_column(String(50), nullable=True)
    check_out: Mapped[str] = mapped_column(String(50), nullable=True)
    work_hours: Mapped[float] = mapped_column(Float, default=0.0)
    overtime_hours: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(50), default="Present")
    location: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
