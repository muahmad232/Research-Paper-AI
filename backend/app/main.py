"""
Research Paper Screening Agent — FastAPI Application Entry Point
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import papers, profile, escalations, gaps, digest, agent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Research Paper Screening Agent backend starting up...")
    yield
    logger.info("🛑 Backend shutting down.")


app = FastAPI(
    title="Research Paper Screening Agent",
    description="AI-powered autonomous research paper discovery and screening system.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(papers.router)
app.include_router(profile.router)
app.include_router(escalations.router)
app.include_router(gaps.router)
app.include_router(digest.router)
app.include_router(agent.router)


@app.get("/", tags=["health"])
def health_check():
    return {
        "status": "ok",
        "service": "Research Paper Screening Agent",
        "version": "1.0.0",
    }


@app.get("/health", tags=["health"])
def health():
    return {"status": "healthy"}
