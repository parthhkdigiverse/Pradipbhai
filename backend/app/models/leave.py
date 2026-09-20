from sqlalchemy import String, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    staff_id: Mapped[str] = mapped_column(String(50), nullable=False)
    staff_name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), default="Casual")
    from_date: Mapped[str] = mapped_column(String(50), nullable=False)
    to_date: Mapped[str] = mapped_column(String(50), nullable=False)
    days: Mapped[int] = mapped_column(Integer, default=1)
    reason: Mapped[str] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Pending") # Pending, Approved, Rejected
    applied_on: Mapped[str] = mapped_column(String(50), nullable=True)
    reviewed_by: Mapped[str] = mapped_column(String(255), nullable=True)
    review_note: Mapped[str] = mapped_column(String(500), nullable=True)
    reviewed_on: Mapped[str] = mapped_column(String(50), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    staff_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    casual: Mapped[int] = mapped_column(Integer, default=12)
    sick: Mapped[int] = mapped_column(Integer, default=10)
    earned: Mapped[int] = mapped_column(Integer, default=15)
