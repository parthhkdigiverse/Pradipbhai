from sqlalchemy import String, Float, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class PayrollRecord(Base):
    __tablename__ = "payroll_records"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    staff_id: Mapped[str] = mapped_column(String(50), nullable=False)
    employee_name: Mapped[str] = mapped_column(String(255), nullable=False)
    month: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. "September 2026"
    salary: Mapped[float] = mapped_column(Float, default=0.0)
    bonus: Mapped[float] = mapped_column(Float, default=0.0)
    deductions: Mapped[float] = mapped_column(Float, default=0.0)
    net_salary: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(50), default="Pending") # Paid, Pending
    account_type: Mapped[str] = mapped_column(String(50), nullable=True) # "Current A/c" | "Savings A/c"
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
