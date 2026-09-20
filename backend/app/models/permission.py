from sqlalchemy import Column, String, Boolean
from app.database import Base

class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(String(255), primary_key=True, index=True)
    role = Column(String(50), nullable=False, index=True)
    action = Column(String(255), nullable=False, index=True)
    allowed = Column(Boolean, default=True, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "role": self.role,
            "action": self.action,
            "allowed": self.allowed
        }
