from pydantic import BaseModel
from typing import Optional

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    time_limit: str
    venue: Optional[str] = "TBA"