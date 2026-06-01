from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
import uuid


class PaperBase(BaseModel):
    external_id: str
    source: str
    title: str
    abstract: Optional[str] = None
    authors: List[str] = []
    categories: List[str] = []
    published_at: Optional[date] = None
    url: Optional[str] = None


class PaperCreate(PaperBase):
    embedding: Optional[List[float]] = None


class Paper(PaperBase):
    id: uuid.UUID
    fetched_at: datetime

    class Config:
        from_attributes = True


class PaperWithRecommendation(Paper):
    final_score: Optional[float] = None
    category: Optional[str] = None
    explanation: Optional[dict] = None
    analysis: Optional[dict] = None
    escalated: Optional[bool] = None
    recommendation_id: Optional[uuid.UUID] = None
