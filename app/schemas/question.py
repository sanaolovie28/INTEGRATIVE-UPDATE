from pydantic import BaseModel

class EventQuestionCreate(BaseModel):
    question_text: str
    question_type: str
    required: bool = False