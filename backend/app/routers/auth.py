"""
Auth router — registration, login, current user.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_db
from app.auth_utils import hash_password, verify_password, create_token, get_current_user
from app.schemas import UserRegister, UserLogin, UserOut, TokenResponse

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: UserRegister, db=Depends(get_db)):
    """Register a new user."""
    existing = db.execute("SELECT id FROM users WHERE email = ?", (body.email,)).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    password_hash = hash_password(body.password)
    cursor = db.execute(
        "INSERT INTO users (email, name, password_hash, role, team) VALUES (?, ?, ?, ?, ?)",
        (body.email, body.name, password_hash, body.role, body.team),
    )
    db.commit()

    user_id = cursor.lastrowid
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    token = create_token(user_id, body.email)

    return TokenResponse(
        access_token=token,
        user=UserOut(**dict(user)),
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db=Depends(get_db)):
    """Login with email + password."""
    user = db.execute("SELECT * FROM users WHERE email = ?", (body.email,)).fetchone()
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user["id"], user["email"])
    return TokenResponse(
        access_token=token,
        user=UserOut(**dict(user)),
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user=Depends(get_current_user)):
    """Get current authenticated user."""
    return UserOut(**current_user)


@router.get("/team")
async def get_team(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Get all team members."""
    users = db.execute(
        "SELECT id, email, name, role, team, created_at FROM users ORDER BY created_at"
    ).fetchall()
    return [dict(u) for u in users]
