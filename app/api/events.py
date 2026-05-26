from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from pydantic import BaseModel 
from typing import List, Union

from app.db.database import SessionLocal
from app.models.event import Event
from app.models.user import User

from app.schemas.event import EventCreate
from app.schemas.response import EventResponse as EventResponseSchema
from app.schemas.user import UserCreate, UserLogin
from app.schemas.question import EventQuestionCreate

from app.models.event_response import EventResponse
from app.models.event_question import EventQuestion
from app.models.response_answer import ResponseAnswer

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class AnswerSchema(BaseModel):
    question_id: Union[int, str]  
    answer: str

class ResponseSubmitSchema(BaseModel):
    event_id: int
    answers: List[AnswerSchema]


@router.post("/responses", status_code=status.HTTP_201_CREATED)
def create_response(data: ResponseSubmitSchema, db: Session = Depends(get_db)):
    try:
        new_response = EventResponse(event_id=data.event_id)
        db.add(new_response)
        db.commit()
        db.refresh(new_response)

        for ans in data.answers:
            try:
                db_question_id = int(ans.question_id)
            except (ValueError, TypeError):
                db_question_id = None 

            new_answer = ResponseAnswer(
                response_id=new_response.id,
                question_id=db_question_id,
                answer=str(ans.answer)
            )
            db.add(new_answer)
        
        db.commit()
        return {"id": new_response.id, "status": "success"}
        
    except Exception as e:
        db.rollback()
        print(f"ERROR SA TERMINAL: {str(e)}") 
        raise HTTPException(status_code=500, detail=f"Database operational error: {str(e)}")


@router.post("/events")
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    new_event = Event(
        title=event.title,
        description=event.description,
        time_limit=event.time_limit,
        venue=getattr(event, 'venue', "TBA")
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return {
        "message": "Event created successfully", 
        "id": new_event.id,
        "title": new_event.title,
        "description": new_event.description,
        "time_limit": new_event.time_limit
    }

@router.get("/events")
def get_events(db: Session = Depends(get_db)):
    return db.query(Event).all()

@router.get("/events/{event_id}")
def get_single_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    questions_list = [
        {"id": "default_name", "question_text": "NAME", "question_type": "text", "required": True},
        {"id": "default_student_no", "question_text": "STUDENT NUMBER", "question_type": "text", "required": True},
        {"id": "default_block", "question_text": "BLOCK", "question_type": "text", "required": True},
        {"id": "default_department", "question_text": "DEPARTMENT", "question_type": "text", "required": True},
        {"id": "default_course", "question_text": "COURSE", "question_type": "text", "required": True}
    ]

    if event.questions:
        for q in event.questions:
            questions_list.append({
                "id": q.id,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "required": q.required
            })

    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "time_limit": event.time_limit,
        "venue": event.venue,
        "questions": questions_list
    }

@router.post("/events/{event_id}/questions")
def add_question(event_id: int, question: EventQuestionCreate, db: Session = Depends(get_db)):
    new_question = EventQuestion(
        event_id=event_id,
        question_text=question.question_text,
        question_type=question.question_type,
        required=question.required
    )
    db.add(new_question)
    db.commit()
    db.refresh(new_question)
    return new_question