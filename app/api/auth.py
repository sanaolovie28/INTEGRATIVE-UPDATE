from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.user import User
from app.models.event import Event
from app.schemas.user import UserCreate, UserLogin
from app.schemas.event import EventCreate
from app.core.security import hash_password, verify_password, create_token

from app.db.database import fetch_student_profile

router = APIRouter(prefix="/auth", tags=["auth"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):

    if not user.email.endswith("@rtu.edu.ph"):
        raise HTTPException(
            status_code=400,
            detail="Only institutional email allowed (@rtu.edu.ph)"
        )

    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    new_user = User(
        name=user.name,
        email=user.email,
        password=hash_password(user.password),
        role=user.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User created successfully"}

@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Login Failed")

    token = create_token({"user_id": db_user.id, "role": db_user.role})

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": db_user.role
    }

@router.get("/auth/student-profile")
async def get_profile(email: str):
    student_info = fetch_student_profile(email)
    
    if not student_info:
        raise HTTPException(status_code=404, detail="Student not found.")
        
    return {
        "success": True,
        "data": student_info
    }