from pydantic import BaseModel
from typing import Optional

class EventResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = ""
    time_limit: str
    venue: Optional[str] = "TBA"

    class Config:
        from_attributes = True
