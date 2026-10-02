from sqlalchemy import String, Integer, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class DailyProgress(Base):
    __tablename__ = "daily_progress"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    employee_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(100), nullable=True)
    date: Mapped[str] = mapped_column(String(50), nullable=False)
    submitted_at: Mapped[str] = mapped_column(String(50), nullable=True)
    tasks_done: Mapped[dict] = mapped_column(JSON, nullable=True) # Array of done tasks
    tasks_pending: Mapped[dict] = mapped_column(JSON, nullable=True) # Array of pending tasks
    verification_status: Mapped[str] = mapped_column(String(50), default="Pending") # Pending, Verified
    rating: Mapped[int] = mapped_column(Integer, default=0) # 1 to 5 stars
    manager_remarks: Mapped[str] = mapped_column(String(500), nullable=True)
    verified_by: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
