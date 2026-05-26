from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class EventQuestion(Base):
    __tablename__ = "event_questions"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"))
    question_text = Column(String, nullable=False)
    question_type = Column(String, nullable=False)
    required = Column(Boolean, default=False)

    event = relationship("Event", back_populates="questions")