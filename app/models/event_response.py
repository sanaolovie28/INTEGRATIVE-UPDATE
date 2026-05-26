from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.database import Base

class EventResponse(Base):
    __tablename__ = "event_responses"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())