from sqlalchemy import String, Float, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class WorkLog(Base):
    __tablename__ = "work_logs"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    staff_id: Mapped[str] = mapped_column(String(50), nullable=True)
    staff_name: Mapped[str] = mapped_column(String(255), nullable=False)
    job_id: Mapped[str] = mapped_column(String(50), nullable=True)
    job_title: Mapped[str] = mapped_column(String(255), nullable=True)
    date: Mapped[str] = mapped_column(String(50), nullable=False)
    hours: Mapped[float] = mapped_column(Float, default=0.0)
    description: Mapped[str] = mapped_column(String(500), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
