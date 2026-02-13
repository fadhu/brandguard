"""
Scans router — upload files, trigger Claude analysis, get dashboard stats.
"""

import json
import os
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from app.database import get_db
from app.auth_utils import get_current_user
from app.claude_service import analyze_asset

router = APIRouter()

UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


async def run_scan(scan_id: int, file_path: str, file_type: str):
    """Background task: run Claude compliance analysis."""
    import sqlite3
    from app.database import DB_PATH

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    try:
        # Update status to scanning
        conn.execute("UPDATE scans SET status = 'scanning' WHERE id = ?", (scan_id,))
        conn.commit()

        # Fetch guidelines from the active rule set
        active_rs = conn.execute("SELECT id FROM rule_sets WHERE is_active = 1").fetchone()
        if active_rs:
            guidelines = conn.execute(
                "SELECT * FROM guidelines WHERE rule_set_id = ?", (active_rs["id"],)
            ).fetchall()
        else:
            guidelines = conn.execute("SELECT * FROM guidelines").fetchall()
        guidelines = [dict(g) for g in guidelines]

        # Run Claude analysis
        result = await analyze_asset(file_path, file_type, guidelines)

        # Update scan with results
        conn.execute(
            """UPDATE scans SET
                status = 'completed',
                overall_score = ?,
                category_scores = ?,
                summary = ?,
                completed_at = CURRENT_TIMESTAMP
            WHERE id = ?""",
            (
                result["overall_score"],
                json.dumps(result.get("category_scores", {})),
                result.get("summary", ""),
                scan_id,
            ),
        )

        # Insert issues
        for issue in result.get("issues", []):
            conn.execute(
                """INSERT INTO issues (scan_id, title, description, category, severity, suggested_fix)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    scan_id,
                    issue["title"],
                    issue["description"],
                    issue["category"],
                    issue["severity"],
                    issue.get("suggested_fix", ""),
                ),
            )

        conn.commit()
        print(f"✓ Scan {scan_id} completed: score {result['overall_score']}")

    except Exception as e:
        conn.execute(
            "UPDATE scans SET status = 'failed', summary = ? WHERE id = ?",
            (str(e), scan_id),
        )
        conn.commit()
        print(f"✗ Scan {scan_id} failed: {e}")
    finally:
        conn.close()


@router.post("/upload", status_code=201)
async def upload_and_scan(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    department: str = Form(""),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Upload a file and trigger a compliance scan."""
    # Validate file type
    allowed_types = {
        "image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp",
        "application/pdf", "image/gif",
        "text/plain", "text/html", "text/css",
    }

    content_type = file.content_type or "application/octet-stream"
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{content_type}' not supported. Allowed: {', '.join(allowed_types)}",
        )

    # Save file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = f"{timestamp}_{file.filename}"
    file_path = UPLOAD_DIR / safe_name

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_size = os.path.getsize(file_path)

    # Create scan record
    cursor = db.execute(
        """INSERT INTO scans (filename, file_path, file_type, file_size, department, scanned_by, status)
           VALUES (?, ?, ?, ?, ?, ?, 'pending')""",
        (file.filename, str(file_path), content_type, file_size, department, current_user["id"]),
    )
    db.commit()
    scan_id = cursor.lastrowid

    # Trigger background analysis
    background_tasks.add_task(run_scan, scan_id, str(file_path), content_type)

    scan = db.execute("SELECT * FROM scans WHERE id = ?", (scan_id,)).fetchone()
    scan_dict = dict(scan)
    scan_dict["category_scores"] = json.loads(scan_dict.get("category_scores", "{}"))
    return scan_dict


@router.get("/")
async def list_scans(
    status: str = None,
    limit: int = 20,
    offset: int = 0,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List scans with optional status filter."""
    if status:
        rows = db.execute(
            "SELECT * FROM scans WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (status, limit, offset),
        ).fetchall()
        total = db.execute("SELECT COUNT(*) as c FROM scans WHERE status = ?", (status,)).fetchone()["c"]
    else:
        rows = db.execute(
            "SELECT * FROM scans ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
        total = db.execute("SELECT COUNT(*) as c FROM scans").fetchone()["c"]

    scans = []
    for r in rows:
        d = dict(r)
        d["category_scores"] = json.loads(d.get("category_scores", "{}"))
        scans.append(d)

    return {"scans": scans, "total": total}


@router.get("/dashboard")
async def dashboard_stats(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get aggregated dashboard statistics."""
    # Overall stats
    completed = db.execute(
        "SELECT * FROM scans WHERE status = 'completed' ORDER BY created_at DESC"
    ).fetchall()

    total_assets = len(completed)
    if total_assets == 0:
        return {
            "overall_score": 0,
            "total_assets": 0,
            "compliant_assets": 0,
            "open_issues": 0,
            "avg_resolution_days": 0,
            "category_scores": {},
            "score_trend": 0,
        }

    scores = [r["overall_score"] for r in completed]
    overall_score = sum(scores) / len(scores)
    compliant = sum(1 for s in scores if s >= 80)

    # Open issues count
    open_issues = db.execute(
        "SELECT COUNT(*) as c FROM issues WHERE status IN ('open', 'in_progress')"
    ).fetchone()["c"]

    # Avg resolution time
    resolved = db.execute("""
        SELECT AVG(julianday(resolved_at) - julianday(created_at)) as avg_days
        FROM issues WHERE status = 'resolved' AND resolved_at IS NOT NULL
    """).fetchone()
    avg_days = round(resolved["avg_days"] or 0, 1)

    # Category score averages
    cat_totals = {}
    cat_counts = {}
    for r in completed:
        cat_scores = json.loads(r["category_scores"]) if r["category_scores"] else {}
        for cat, score in cat_scores.items():
            cat_totals[cat] = cat_totals.get(cat, 0) + score
            cat_counts[cat] = cat_counts.get(cat, 0) + 1

    category_scores = {
        cat: round(cat_totals[cat] / cat_counts[cat])
        for cat in cat_totals
    }

    # Score trend (compare last 7 days vs previous 7 days)
    now = datetime.now()
    week_ago = (now - timedelta(days=7)).isoformat()
    two_weeks_ago = (now - timedelta(days=14)).isoformat()

    recent = db.execute(
        "SELECT AVG(overall_score) as avg FROM scans WHERE status='completed' AND created_at >= ?",
        (week_ago,),
    ).fetchone()["avg"] or 0

    previous = db.execute(
        "SELECT AVG(overall_score) as avg FROM scans WHERE status='completed' AND created_at >= ? AND created_at < ?",
        (two_weeks_ago, week_ago),
    ).fetchone()["avg"] or 0

    trend = round(recent - previous, 1) if previous else 0

    return {
        "overall_score": round(overall_score, 1),
        "total_assets": total_assets,
        "compliant_assets": compliant,
        "open_issues": open_issues,
        "avg_resolution_days": avg_days,
        "category_scores": category_scores,
        "score_trend": trend,
    }


@router.get("/{scan_id}")
async def get_scan(
    scan_id: int,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get a single scan with its issues."""
    scan = db.execute("SELECT * FROM scans WHERE id = ?", (scan_id,)).fetchone()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    issues = db.execute(
        "SELECT * FROM issues WHERE scan_id = ? ORDER BY severity DESC, created_at",
        (scan_id,),
    ).fetchall()

    scan_dict = dict(scan)
    scan_dict["category_scores"] = json.loads(scan_dict.get("category_scores", "{}"))
    scan_dict["issues"] = [dict(i) for i in issues]
    return scan_dict


@router.delete("/{scan_id}", status_code=204)
async def delete_scan(
    scan_id: int,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Delete a scan and its issues."""
    scan = db.execute("SELECT * FROM scans WHERE id = ?", (scan_id,)).fetchone()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    # Delete the uploaded file
    try:
        os.remove(scan["file_path"])
    except OSError:
        pass

    db.execute("DELETE FROM scans WHERE id = ?", (scan_id,))
    db.commit()
