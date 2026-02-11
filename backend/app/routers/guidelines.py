"""
Brand Guidelines router — CRUD operations.
"""

import json
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.auth_utils import get_current_user
from app.schemas import GuidelineCreate, GuidelineUpdate, GuidelineOut

router = APIRouter()


def row_to_guideline(row) -> dict:
    """Convert a DB row to a guideline dict with parsed JSON fields."""
    d = dict(row)
    d["rules"] = json.loads(d["rules"]) if isinstance(d["rules"], str) else d["rules"]
    d["examples"] = json.loads(d["examples"]) if isinstance(d["examples"], str) else d["examples"]
    return d


@router.get("/")
async def list_guidelines(
    category: str = None,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List all brand guidelines, optionally filtered by category."""
    if category:
        rows = db.execute(
            "SELECT * FROM guidelines WHERE category = ? ORDER BY category, title",
            (category,),
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT * FROM guidelines ORDER BY category, title"
        ).fetchall()

    return [row_to_guideline(r) for r in rows]


@router.get("/summary")
async def guidelines_summary(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get a summary count of guidelines per category."""
    rows = db.execute("""
        SELECT category, COUNT(*) as count,
               MAX(updated_at) as last_updated
        FROM guidelines GROUP BY category
    """).fetchall()
    return [dict(r) for r in rows]


@router.get("/{guideline_id}")
async def get_guideline(
    guideline_id: int,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get a single guideline by ID."""
    row = db.execute("SELECT * FROM guidelines WHERE id = ?", (guideline_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Guideline not found")
    return row_to_guideline(row)


@router.post("/", status_code=201)
async def create_guideline(
    body: GuidelineCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Create a new brand guideline."""
    cursor = db.execute(
        """INSERT INTO guidelines (category, title, description, rules, examples, created_by)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (
            body.category,
            body.title,
            body.description,
            json.dumps(body.rules),
            json.dumps(body.examples),
            current_user["id"],
        ),
    )
    db.commit()
    row = db.execute("SELECT * FROM guidelines WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return row_to_guideline(row)


@router.patch("/{guideline_id}")
async def update_guideline(
    guideline_id: int,
    body: GuidelineUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Update an existing guideline."""
    existing = db.execute("SELECT * FROM guidelines WHERE id = ?", (guideline_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Guideline not found")

    updates = {}
    if body.title is not None:
        updates["title"] = body.title
    if body.description is not None:
        updates["description"] = body.description
    if body.rules is not None:
        updates["rules"] = json.dumps(body.rules)
    if body.examples is not None:
        updates["examples"] = json.dumps(body.examples)

    if updates:
        updates["updated_at"] = "CURRENT_TIMESTAMP"
        set_clause = ", ".join(
            f"{k} = CURRENT_TIMESTAMP" if v == "CURRENT_TIMESTAMP" else f"{k} = ?"
            for k, v in updates.items()
        )
        values = [v for v in updates.values() if v != "CURRENT_TIMESTAMP"]
        values.append(guideline_id)
        db.execute(f"UPDATE guidelines SET {set_clause} WHERE id = ?", values)
        db.commit()

    row = db.execute("SELECT * FROM guidelines WHERE id = ?", (guideline_id,)).fetchone()
    return row_to_guideline(row)


@router.delete("/{guideline_id}", status_code=204)
async def delete_guideline(
    guideline_id: int,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Delete a guideline."""
    existing = db.execute("SELECT id FROM guidelines WHERE id = ?", (guideline_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Guideline not found")
    db.execute("DELETE FROM guidelines WHERE id = ?", (guideline_id,))
    db.commit()
