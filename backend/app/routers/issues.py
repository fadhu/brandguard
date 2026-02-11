"""
Issues router — list, filter, update, resolve issues.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from app.database import get_db
from app.auth_utils import get_current_user
from app.schemas import IssueUpdate

router = APIRouter()


@router.get("/")
async def list_issues(
    status: str = None,
    severity: str = None,
    category: str = None,
    limit: int = 50,
    offset: int = 0,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List issues with optional filters."""
    query = "SELECT i.*, s.filename as scan_filename FROM issues i JOIN scans s ON i.scan_id = s.id WHERE 1=1"
    params = []

    if status:
        query += " AND i.status = ?"
        params.append(status)
    if severity:
        query += " AND i.severity = ?"
        params.append(severity)
    if category:
        query += " AND i.category = ?"
        params.append(category)

    # Count total before pagination
    count_query = query.replace(
        "SELECT i.*, s.filename as scan_filename",
        "SELECT COUNT(*) as c",
    )
    total = db.execute(count_query, params).fetchone()["c"]

    # Order: open first, then by severity (high > medium > low)
    query += """
        ORDER BY
            CASE i.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
            CASE i.severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
            i.created_at DESC
        LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])

    rows = db.execute(query, params).fetchall()
    return {"issues": [dict(r) for r in rows], "total": total}


@router.get("/stats")
async def issue_stats(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get issue statistics breakdown."""
    # By status
    by_status = db.execute(
        "SELECT status, COUNT(*) as count FROM issues GROUP BY status"
    ).fetchall()

    # By severity
    by_severity = db.execute(
        "SELECT severity, COUNT(*) as count FROM issues GROUP BY severity"
    ).fetchall()

    # By category
    by_category = db.execute(
        "SELECT category, COUNT(*) as count FROM issues GROUP BY category"
    ).fetchall()

    return {
        "by_status": {r["status"]: r["count"] for r in by_status},
        "by_severity": {r["severity"]: r["count"] for r in by_severity},
        "by_category": {r["category"]: r["count"] for r in by_category},
        "total": sum(r["count"] for r in by_status),
    }


@router.get("/{issue_id}")
async def get_issue(
    issue_id: int,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Get a single issue."""
    row = db.execute(
        "SELECT i.*, s.filename as scan_filename FROM issues i JOIN scans s ON i.scan_id = s.id WHERE i.id = ?",
        (issue_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Issue not found")
    return dict(row)


@router.patch("/{issue_id}")
async def update_issue(
    issue_id: int,
    body: IssueUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Update an issue (status, fix text)."""
    existing = db.execute("SELECT * FROM issues WHERE id = ?", (issue_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Issue not found")

    if body.status:
        valid = {"open", "in_progress", "resolved", "dismissed"}
        if body.status not in valid:
            raise HTTPException(status_code=400, detail=f"Status must be one of: {valid}")

        if body.status == "resolved":
            db.execute(
                "UPDATE issues SET status = ?, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?",
                (body.status, current_user["id"], issue_id),
            )
        else:
            db.execute(
                "UPDATE issues SET status = ? WHERE id = ?",
                (body.status, issue_id),
            )

    if body.suggested_fix:
        db.execute(
            "UPDATE issues SET suggested_fix = ? WHERE id = ?",
            (body.suggested_fix, issue_id),
        )

    db.commit()

    row = db.execute(
        "SELECT i.*, s.filename as scan_filename FROM issues i JOIN scans s ON i.scan_id = s.id WHERE i.id = ?",
        (issue_id,),
    ).fetchone()
    return dict(row)


@router.post("/{issue_id}/resolve")
async def resolve_issue(
    issue_id: int,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Quick-resolve an issue."""
    existing = db.execute("SELECT * FROM issues WHERE id = ?", (issue_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Issue not found")

    db.execute(
        "UPDATE issues SET status = 'resolved', resolved_by = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?",
        (current_user["id"], issue_id),
    )
    db.commit()

    return {"message": "Issue resolved", "id": issue_id}
