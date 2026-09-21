from sqlalchemy import Column, String, Boolean, JSON
from app.database import Base

class AccessRestriction(Base):
    __tablename__ = "access_restrictions"

    id = Column(String(50), primary_key=True, default="default")
    ip_whitelist = Column(JSON, nullable=True)
    enable_time_restrictions = Column(Boolean, default=False)
    start_time = Column(String(10), default="09:00")
    end_time = Column(String(10), default="18:00")
    enable_geo_restrictions = Column(Boolean, default=False)
    allowed_pincodes = Column(JSON, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "ipWhitelist": self.ip_whitelist or [],
            "enableTimeRestrictions": self.enable_time_restrictions,
            "startTime": self.start_time or "09:00",
            "endTime": self.end_time or "18:00",
            "enableGeoRestrictions": self.enable_geo_restrictions,
            "allowedPincodes": self.allowed_pincodes or []
        }
