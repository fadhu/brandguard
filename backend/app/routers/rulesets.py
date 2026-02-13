"""
Rule Sets router — manage rule sets and upload brand kits for AI extraction.
"""

import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from app.database import get_db
from app.auth_utils import get_current_user
from app.schemas import RuleSetCreate, RuleSetUpdate

router = APIRouter()

BRANDKIT_DIR = Path(__file__).parent.parent / "brandkits"
BRANDKIT_DIR.mkdir(exist_ok=True)


async def extract_brand_kit_rules(rule_set_id: int, file_path: str, file_type: str):
    """Background task: send brand kit to Gemini for rule extraction."""
    import sqlite3
    from app.database import DB_PATH
    from app.claude_service import extract_guidelines_from_brandkit

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    try:
        result = await extract_guidelines_from_brandkit(file_path, file_type)

        for guideline in result.get("guidelines", []):
            conn.execute(
                """INSERT INTO guidelines (category, title, description, rules, examples, rule_set_id, created_by)
                   VALUES (?, ?, ?, ?, '[]', ?, NULL)""",
                (
                    guideline["category"],
                    guideline["title"],
                    guideline["description"],
                    json.dumps(guideline.get("rules", [])),
                    rule_set_id,
                ),
            )

        conn.execute(
            "UPDATE rule_sets SET status = 'ready', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (rule_set_id,),
        )
        conn.commit()
        count = len(result.get("guidelines", []))
        print(f"✓ Brand kit {rule_set_id}: extracted {count} guidelines")

    except Exception as e:
        conn.execute(
            "UPDATE rule_sets SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (str(e), rule_set_id),
        )
        conn.commit()
        print(f"✗ Brand kit {rule_set_id} extraction failed: {e}")
    finally:
        conn.close()


@router.get("/")
async def list_rule_sets(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List all rule sets with guideline counts."""
    rows = db.execute("""
        SELECT rs.*, COUNT(g.id) as guideline_count
        FROM rule_sets rs
        LEFT JOIN guidelines g ON g.rule_set_id = rs.id
        GROUP BY rs.id
        ORDER BY rs.is_active DESC, rs.created_at DESC
    """).fetchall()
    return [dict(r) for r in rows]


@router.post("/", status_code=201)
async def create_rule_set(
    body: RuleSetCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Create a new empty manual rule set."""
    cursor = db.execute(
        """INSERT INTO rule_sets (name, description, source_type, status, is_active, created_by)
           VALUES (?, ?, 'manual', 'ready', 0, ?)""",
        (body.name, body.description, current_user["id"]),
    )
    db.commit()
    row = db.execute(
        "SELECT rs.*, 0 as guideline_count FROM rule_sets rs WHERE rs.id = ?",
        (cursor.lastrowid,),
    ).fetchone()
    return dict(row)


@router.post("/upload", status_code=201)
async def upload_brand_kit(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    name: str = Form(""),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Upload a brand kit file and trigger AI rule extraction."""
    allowed = {
        "application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp",
    }
    content_type = file.content_type or "application/octet-stream"
    if content_type not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Only PDF and image files are supported. Got: {content_type}",
        )

    # Save file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{timestamp}_{file.filename}"
    file_path = BRANDKIT_DIR / safe_name

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    display_name = name.strip() or f"Brand Kit — {file.filename}"

    cursor = db.execute(
        """INSERT INTO rule_sets (name, description, source_type, status, source_filename, source_file_path, created_by)
           VALUES (?, ?, 'upload', 'processing', ?, ?, ?)""",
        (
            display_name,
            f"Extracted from {file.filename}",
            file.filename,
            str(file_path),
            current_user["id"],
        ),
    )
    db.commit()
    rule_set_id = cursor.lastrowid

    background_tasks.add_task(extract_brand_kit_rules, rule_set_id, str(file_path), content_type)

    row = db.execute(
        "SELECT rs.*, 0 as guideline_count FROM rule_sets rs WHERE rs.id = ?",
        (rule_set_id,),
    ).fetchone()
    return dict(row)


@router.post("/{rule_set_id}/activate")
async def activate_rule_set(
    rule_set_id: int,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Set a rule set as the active one (deactivates all others)."""
    rs = db.execute("SELECT * FROM rule_sets WHERE id = ?", (rule_set_id,)).fetchone()
    if not rs:
        raise HTTPException(status_code=404, detail="Rule set not found")
    if rs["status"] != "ready":
        raise HTTPException(status_code=400, detail="Cannot activate a rule set that is not ready")

    db.execute("UPDATE rule_sets SET is_active = 0")
    db.execute("UPDATE rule_sets SET is_active = 1 WHERE id = ?", (rule_set_id,))
    db.commit()
    return {"message": "Rule set activated", "id": rule_set_id}


@router.patch("/{rule_set_id}")
async def update_rule_set(
    rule_set_id: int,
    body: RuleSetUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Update a rule set's name or description."""
    existing = db.execute("SELECT * FROM rule_sets WHERE id = ?", (rule_set_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Rule set not found")

    updates = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.description is not None:
        updates["description"] = body.description

    if updates:
        set_parts = [f"{k} = ?" for k in updates]
        set_parts.append("updated_at = CURRENT_TIMESTAMP")
        values = list(updates.values()) + [rule_set_id]
        db.execute(f"UPDATE rule_sets SET {', '.join(set_parts)} WHERE id = ?", values)
        db.commit()

    row = db.execute("""
        SELECT rs.*, COUNT(g.id) as guideline_count
        FROM rule_sets rs LEFT JOIN guidelines g ON g.rule_set_id = rs.id
        WHERE rs.id = ? GROUP BY rs.id
    """, (rule_set_id,)).fetchone()
    return dict(row)


@router.delete("/{rule_set_id}", status_code=204)
async def delete_rule_set(
    rule_set_id: int,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Delete a rule set and all its guidelines."""
    rs = db.execute("SELECT * FROM rule_sets WHERE id = ?", (rule_set_id,)).fetchone()
    if not rs:
        raise HTTPException(status_code=404, detail="Rule set not found")

    # Delete associated guidelines first (in case CASCADE isn't working)
    db.execute("DELETE FROM guidelines WHERE rule_set_id = ?", (rule_set_id,))
    db.execute("DELETE FROM rule_sets WHERE id = ?", (rule_set_id,))
    db.commit()

    # Delete source file if it exists
    if rs["source_file_path"]:
        try:
            os.remove(rs["source_file_path"])
        except OSError:
            pass
