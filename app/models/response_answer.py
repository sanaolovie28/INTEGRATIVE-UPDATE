from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.database import Base

class ResponseAnswer(Base):
    __tablename__ = "response_answers"

    id = Column(Integer, primary_key=True, index=True)
    response_id = Column(Integer, ForeignKey("event_responses.id"))
    question_id = Column(Integer, ForeignKey("event_questions.id"))
    answer = Column(String, nullable=False)