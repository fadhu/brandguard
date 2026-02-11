"""
Database models and initialization — SQLite with raw SQL for simplicity.
"""

import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "brandguard.db"


def get_db():
    """Get a database connection (used as FastAPI dependency)."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    """Create all tables if they don't exist."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
            team TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS guidelines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL CHECK (category IN (
                'color', 'typography', 'logo', 'imagery', 'voice', 'layout'
            )),
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            rules TEXT NOT NULL DEFAULT '[]',  -- JSON array of rule strings
            examples TEXT DEFAULT '[]',         -- JSON array of example URLs/descriptions
            created_by INTEGER REFERENCES users(id),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending' CHECK (status IN (
                'pending', 'scanning', 'completed', 'failed'
            )),
            overall_score INTEGER DEFAULT 0,
            category_scores TEXT DEFAULT '{}',  -- JSON: {"color": 94, "typography": 88, ...}
            summary TEXT DEFAULT '',
            department TEXT DEFAULT '',
            scanned_by INTEGER REFERENCES users(id),
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS issues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id INTEGER REFERENCES scans(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL CHECK (category IN (
                'color', 'typography', 'logo', 'imagery', 'voice', 'layout'
            )),
            severity TEXT NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
            suggested_fix TEXT DEFAULT '',
            status TEXT DEFAULT 'open' CHECK (status IN (
                'open', 'in_progress', 'resolved', 'dismissed'
            )),
            resolved_by INTEGER REFERENCES users(id),
            resolved_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
        CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
        CREATE INDEX IF NOT EXISTS idx_issues_scan ON issues(scan_id);
        CREATE INDEX IF NOT EXISTS idx_guidelines_category ON guidelines(category);
    """)

    conn.commit()
    conn.close()
    print(f"✓ Database initialized at {DB_PATH}")
