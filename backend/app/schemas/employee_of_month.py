from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime

class EmployeeEvaluationBase(BaseModel):
    employee_id: str
    employee_name: str
    employee_role: Optional[str] = None
    month: str  # e.g. "2026-10"
    year: Optional[int] = 2026
    criteria_scores: Optional[Dict[str, float]] = None
    total_score: Optional[float] = 0.0
    max_score: Optional[float] = 100.0
    percentage: Optional[float] = 0.0
    is_winner: Optional[bool] = False
    badge: Optional[str] = None
    manager_remarks: Optional[str] = None
    evaluated_by: Optional[str] = None
    evaluated_by_role: Optional[str] = None

class EmployeeEvaluationCreate(EmployeeEvaluationBase):
    id: Optional[str] = None

class EmployeeEvaluationUpdate(BaseModel):
    criteria_scores: Optional[Dict[str, float]] = None
    total_score: Optional[float] = None
    max_score: Optional[float] = None
    percentage: Optional[float] = None
    is_winner: Optional[bool] = None
    badge: Optional[str] = None
    manager_remarks: Optional[str] = None
    evaluated_by: Optional[str] = None
    evaluated_by_role: Optional[str] = None

class EmployeeEvaluationOut(EmployeeEvaluationBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
