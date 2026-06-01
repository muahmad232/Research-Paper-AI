from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid


class RecommendationBase(BaseModel):
    paper_id: uuid.UUID
    profile_id: uuid.UUID
    semantic_score: float = 0.0
    keyword_score: float = 0.0
    recency_score: float = 0.0
    final_score: float = 0.0
    category: str
    explanation: dict = {}
    analysis: dict = {}
    escalated: bool = False
    user_decision: Optional[str] = None


class Recommendation(RecommendationBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class EscalationDecision(BaseModel):
    decision: str  # 'accept' | 'reject'


class DailyDigest(BaseModel):
    id: uuid.UUID
    digest_date: str
    total_fetched: int
    highly_relevant: int
    potentially_relevant: int
    escalated: int
    summary: Optional[str] = None
    top_paper_ids: List[uuid.UUID] = []
    created_at: datetime
