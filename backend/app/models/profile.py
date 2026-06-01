from pydantic import BaseModel
from typing import List
import uuid


class UserProfileBase(BaseModel):
    research_interests: List[str] = []
    keywords: List[str] = []
    preferred_domains: List[str] = []
    preferred_venues: List[str] = []
    excluded_topics: List[str] = []


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileUpdate(UserProfileBase):
    pass


class UserProfile(UserProfileBase):
    id: uuid.UUID

    class Config:
        from_attributes = True
