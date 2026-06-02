from pydantic import BaseModel
from typing import List, Optional
import uuid


class UserProfileBase(BaseModel):
    research_interests: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    preferred_domains: Optional[List[str]] = None
    preferred_venues: Optional[List[str]] = None
    excluded_topics: Optional[List[str]] = None


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileUpdate(UserProfileBase):
    """All fields optional — only provided fields will be updated."""
    pass


class UserProfile(UserProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID

    class Config:
        from_attributes = True
