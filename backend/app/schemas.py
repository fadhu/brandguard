"""
Pydantic schemas for request/response validation.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── Auth ──
class UserRegister(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: str = "member"
    team: str = ""

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    name: str
    role: str
    team: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Guidelines ──
class GuidelineCreate(BaseModel):
    category: str
    title: str
    description: str
    rules: List[str] = []
    examples: List[str] = []

class GuidelineUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    rules: Optional[List[str]] = None
    examples: Optional[List[str]] = None

class GuidelineOut(BaseModel):
    id: int
    category: str
    title: str
    description: str
    rules: List[str]
    examples: List[str]
    created_by: Optional[int]
    updated_at: str
    created_at: str


# ── Scans ──
class ScanOut(BaseModel):
    id: int
    filename: str
    file_type: str
    file_size: int
    status: str
    overall_score: int
    category_scores: dict
    summary: str
    department: str
    scanned_by: Optional[int]
    completed_at: Optional[str]
    created_at: str

class ScanListOut(BaseModel):
    scans: List[ScanOut]
    total: int

class DashboardStats(BaseModel):
    overall_score: float
    total_assets: int
    compliant_assets: int
    open_issues: int
    avg_resolution_days: float
    category_scores: dict
    score_trend: float  # % change from last week


# ── Issues ──
class IssueOut(BaseModel):
    id: int
    scan_id: int
    title: str
    description: str
    category: str
    severity: str
    suggested_fix: str
    status: str
    resolved_by: Optional[int]
    resolved_at: Optional[str]
    created_at: str

class IssueUpdate(BaseModel):
    status: Optional[str] = None
    suggested_fix: Optional[str] = None
