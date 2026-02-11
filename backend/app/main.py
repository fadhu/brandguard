"""
Brandguard — Brand Compliance Agent Backend
FastAPI + SQLite + Gemini API
"""

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import uvicorn

from app.database import init_db
from app.routers import auth, guidelines, scans, issues

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    init_db()
    yield

app = FastAPI(
    title="Brandguard API",
    description="Brand compliance agent powered by Gemini",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(guidelines.router, prefix="/api/guidelines", tags=["Brand Guidelines"])
app.include_router(scans.router, prefix="/api/scans", tags=["Scans"])
app.include_router(issues.router, prefix="/api/issues", tags=["Issues"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "brandguard"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
