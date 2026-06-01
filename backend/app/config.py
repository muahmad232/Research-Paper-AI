from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_service_key: str

    # Groq
    groq_api_key: str

    # Agent
    daily_agent_secret: str = "changeme"
    max_papers_per_run: int = 200
    arxiv_query_terms: str = "LLM,RAG,multi-agent,transformer,hallucination"
    arxiv_categories: str = "cs.AI,cs.CL,cs.LG"

    # CORS
    allowed_origins: List[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
