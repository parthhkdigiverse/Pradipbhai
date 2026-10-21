from sqlalchemy import String, Float, Integer, Boolean, DateTime, JSON, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class EmployeeEvaluation(Base):
    __tablename__ = "employee_evaluations"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    employee_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    employee_name: Mapped[str] = mapped_column(String(255), nullable=False)
    employee_role: Mapped[str] = mapped_column(String(100), nullable=True)
    month: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # e.g. "2026-10"
    year: Mapped[int] = mapped_column(Integer, nullable=False, default=2026)
    criteria_scores: Mapped[dict] = mapped_column(JSON, nullable=True)  # { criteriaId: score }
    total_score: Mapped[float] = mapped_column(Float, default=0.0)
    max_score: Mapped[float] = mapped_column(Float, default=100.0)
    percentage: Mapped[float] = mapped_column(Float, default=0.0)
    is_winner: Mapped[bool] = mapped_column(Boolean, default=False)
    badge: Mapped[str] = mapped_column(String(100), nullable=True)
    manager_remarks: Mapped[str] = mapped_column(Text, nullable=True)
    evaluated_by: Mapped[str] = mapped_column(String(255), nullable=True)
    evaluated_by_role: Mapped[str] = mapped_column(String(100), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
