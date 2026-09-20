from sqlalchemy import String, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    client_id: Mapped[str] = mapped_column(String(50), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    project_id: Mapped[str] = mapped_column(String(50), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    assigned_staff_id: Mapped[str] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Pending") # Pending, Active, Completed
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    client = relationship("Client", back_populates="jobs")
    project = relationship("Project", back_populates="jobs")
