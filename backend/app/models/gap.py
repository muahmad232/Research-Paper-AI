from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid


class ResearchGap(BaseModel):
    id: uuid.UUID
    profile_id: Optional[uuid.UUID] = None
    gap_title: str
    description: Optional[str] = None
    supporting_paper_ids: List[uuid.UUID] = []
    trend_type: str  # 'gap' | 'emerging_trend' | 'hot_topic'
    created_at: datetime

    class Config:
        from_attributes = True
