import sqlite3
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./attendance.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False} 
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def fetch_student_profile(email: str):
    conn = sqlite3.connect("./attendance.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT name, student_number, year_level, department, course, email 
        FROM users 
        WHERE LOWER(email) = LOWER(?) AND LOWER(role) = 'student'
    """, (email,))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return None

def fetch_admin_profile(email: str):
    conn = sqlite3.connect("./attendance.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT name, student_number, year_level, organization, position, email 
        FROM users 
        WHERE LOWER(email) = LOWER(?) AND LOWER(role) = 'admin'
    """, (email,))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return None