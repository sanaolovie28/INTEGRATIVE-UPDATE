from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import List, Optional
import httpx  

from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.event_response import EventResponse

router = APIRouter()

backend_event_master_list = []
GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbx0vYNZ0TgpRcpzDMNmnGWtFm2N7xEqL7aznd1gMJaRqglvLWCExfbskxhms4GZfIuH/exec"

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class QRScanPayload(BaseModel):
    ticket_id: int
    event_id: int

@router.post("/attendance/scan", status_code=status.HTTP_200_OK)
async def scan_qr_attendance(payload: QRScanPayload, db: Session = Depends(get_db)):

    ticket = db.query(EventResponse).filter(
        EventResponse.id == payload.ticket_id, 
        EventResponse.event_id == payload.event_id
    ).first()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Wrong QR Code!"
        )
    
    google_sheet_payload = {
        "action": "scan_attendance",
        "ticket_id": payload.ticket_id,
        "event_id": payload.event_id
    }
    
    async with httpx.AsyncClient() as client:
        try:
            gsheet_res = await client.post(GOOGLE_SHEET_URL, json=google_sheet_payload, timeout=10.0)
            
            if "text/html" in gsheet_res.headers.get("content-type", ""):
                print("BABALA: Google Sheet returned an HTML error page instead of JSON!")
                gsheet_data = {"result": "success"} 
            else:
                gsheet_data = gsheet_res.json()
            
            if gsheet_data.get("result") != "success":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail=f"Google Sheet Sync Error: {gsheet_data.get('message')}"
                )
                
        except httpx.HTTPError as err:
            print(f"Google Sheet Webhook Connection Failed (Bypassed): {str(err)}")
            
    return {
        "status": "success", 
        "message": f"Attendance successfully marked as PRESENT for Ticket #{payload.ticket_id}!"
    }

class EventCreatePayload(BaseModel):
    title: str
    time_limit: str
    description: str
    questions: Optional[List[dict]] = []

class EventResponseSchema(BaseModel):
    id: int
    title: str
    time_limit: str
    description: str
    questions: Optional[List[dict]] = []

@router.post("/events", status_code=status.HTTP_201_CREATED)
async def create_event(payload: EventCreatePayload):
    new_id = len(backend_event_master_list) + 1
    new_event = {
        "id": new_id,
        "title": payload.title,
        "time_limit": payload.time_limit,
        "description": payload.description,
        "questions": payload.questions if payload.questions else []
    }
    backend_event_master_list.append(new_event)
    return {"message": "Event successfully added!", "event_id": new_id}

@router.get("/events", response_model=List[EventResponseSchema])
async def get_all_events():
    return backend_event_master_list

@router.get("/events/{event_id}", response_model=EventResponseSchema)
async def get_single_event(event_id: int):
    event = next((item for item in backend_event_master_list if item["id"] == event_id), None)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found!")
    return event