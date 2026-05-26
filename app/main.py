from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import Base, engine

from app.api.events import router as event_router
from app.api.auth import router as auth_router
from app.api.attendance import router as attendance_router

from app.models.event import Event
from app.models.user import User

from app.models.event_question import EventQuestion
from app.models.event_response import EventResponse
from app.models.response_answer import ResponseAnswer

app = FastAPI()

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500", "http://127.0.0.1:8000",
    "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(event_router)
app.include_router(auth_router)
app.include_router(attendance_router)
@app.get("/")
def root():
    return {"message": "API running"}