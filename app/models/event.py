from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.db.database import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    time_limit = Column(String, nullable=False)
    venue = Column(String, nullable=False)

    questions = relationship("EventQuestion", back_populates="event")

