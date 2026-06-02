from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_service_key: str

    # Groq
    groq_api_key: str

    # Agent
    daily_agent_secret: str
    max_papers_per_run: int = 50

    # JWT Auth
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expiry_days: int = 7

    # CORS
    allowed_origins: List[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
