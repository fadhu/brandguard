"""
Seed script — populates the database with sample data for development.
Run: python -m app.seed
"""

import json
import sqlite3
from pathlib import Path
from app.database import init_db, DB_PATH
from app.auth_utils import hash_password


def seed():
    init_db()
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    # Check if already seeded
    user_count = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    if user_count > 0:
        print("Database already seeded. Skipping.")
        conn.close()
        return

    print("Seeding database...")

    # ── Users ──
    users = [
        ("sarah@brandguard.io", "Sarah Reeves", "admin", "Brand"),
        ("james@brandguard.io", "James Chen", "manager", "Marketing"),
        ("lisa@brandguard.io", "Lisa Park", "member", "Design"),
        ("mike@brandguard.io", "Mike Torres", "member", "Product"),
    ]

    for email, name, role, team in users:
        conn.execute(
            "INSERT INTO users (email, name, password_hash, role, team) VALUES (?, ?, ?, ?, ?)",
            (email, name, hash_password("password123"), role, team),
        )

    # ── Default Rule Set ──
    conn.execute(
        """INSERT INTO rule_sets (name, description, source_type, status, is_active, created_by)
           VALUES ('Manual Rules', 'Default manually entered brand guidelines', 'manual', 'ready', 1, 1)"""
    )

    # ── Guidelines ──
    guidelines = [
        {
            "category": "color",
            "title": "Primary Color Palette",
            "description": "Our brand uses a refined palette with a dominant blue, supported by neutral tones. All digital materials must use these exact color values.",
            "rules": [
                "Primary Blue: #2B5CE6 — used for CTAs, links, and key UI elements",
                "Dark Navy: #1A1A1F — used for primary text and headers",
                "Warm Gray: #6B6B76 — used for secondary/body text",
                "Light Background: #F6F5F1 — used for page backgrounds",
                "Never use pure black (#000000) or pure white (#FFFFFF)",
                "Accent colors must have a contrast ratio of at least 4.5:1 against backgrounds",
            ],
            "examples": ["hero-banner.png", "cta-buttons.png"],
        },
        {
            "category": "typography",
            "title": "Typography System",
            "description": "Our type system pairs Fraunces (display serif) with DM Sans (body sans-serif) for a warm yet professional feel.",
            "rules": [
                "Display/Headlines: Fraunces, weights 500 and 700 only",
                "Body text: DM Sans, weights 400 and 500 only",
                "Never use font-weight 800 or 900 (Extra/Ultra Bold)",
                "Minimum body text size: 14px (web), 16px (mobile)",
                "Line height: 1.5 for body, 1.2 for headlines",
                "Letter spacing: -0.5px for headlines, 0 for body",
            ],
            "examples": ["type-scale.png"],
        },
        {
            "category": "logo",
            "title": "Logo Usage Guidelines",
            "description": "The Brandguard logo has horizontal and stacked variants. Proper usage ensures brand recognition.",
            "rules": [
                "Horizontal logo: use only in wide/landscape contexts (headers, footers)",
                "Stacked logo: use in vertical/square contexts (social, app icons)",
                "Minimum clear space: 2x the height of the 'B' lettermark",
                "Never stretch, rotate, or add effects to the logo",
                "On dark backgrounds, use the white variant only",
                "Minimum size: 80px wide (digital), 25mm (print)",
                "Never place the logo on busy/patterned backgrounds without a container",
                "Logo color: Primary Blue (#2B5CE6) or White only",
            ],
            "examples": ["logo-horizontal.svg", "logo-stacked.svg"],
        },
        {
            "category": "imagery",
            "title": "Photography & Illustration Style",
            "description": "Our imagery conveys warmth, professionalism, and authenticity. We favor natural lighting and real scenarios.",
            "rules": [
                "Photography: natural lighting, warm color temperature",
                "No stock photo clichés (handshakes, fake smiles, pointing at screens)",
                "People should look authentic and diverse",
                "Illustrations: flat style with brand colors, subtle textures welcome",
                "Icons: outlined style, 2px stroke, rounded caps, brand colors",
            ],
            "examples": [],
        },
        {
            "category": "voice",
            "title": "Brand Voice & Tone",
            "description": "Our voice is professional yet warm — confident without being arrogant, helpful without being patronizing.",
            "rules": [
                "Tone: conversational but polished — no slang (gonna, wanna, ain't)",
                "Address users directly with 'you' and 'your'",
                "Use active voice over passive voice",
                "Avoid jargon unless writing for a technical audience",
                "Headlines: clear and benefit-driven, not clever or punny",
                "CTAs: action-oriented verbs (Start, Create, Review) — not vague (Click here, Submit)",
                "Error messages: empathetic and solution-oriented",
                "Never use ALL CAPS for emphasis — use bold or italics sparingly",
            ],
            "examples": [],
        },
        {
            "category": "layout",
            "title": "Layout & Spacing System",
            "description": "Our layouts use an 8px grid system with generous whitespace for a clean, breathable feel.",
            "rules": [
                "Base spacing unit: 8px — all spacing must be multiples of 8",
                "Content max-width: 1200px for marketing pages, 1440px for app UI",
                "Card border-radius: 12px (standard), 8px (small), 16px (large)",
                "Section padding: minimum 64px vertical on desktop, 40px on mobile",
                "Grid: 12-column on desktop, 4-column on mobile",
            ],
            "examples": [],
        },
    ]

    for g in guidelines:
        conn.execute(
            """INSERT INTO guidelines (category, title, description, rules, examples, rule_set_id, created_by)
               VALUES (?, ?, ?, ?, ?, 1, 1)""",
            (g["category"], g["title"], g["description"], json.dumps(g["rules"]), json.dumps(g["examples"])),
        )

    # ── Sample Scans ──
    scans = [
        ("Q1_Campaign_Hero_Banner.pdf", "application/pdf", 2_400_000, "completed", 92, "Marketing",
         {"color": 95, "typography": 94, "logo": 88, "imagery": 90, "voice": 92, "layout": 91}),
        ("Social_Instagram_Story_Feb.png", "image/png", 850_000, "completed", 67, "Social",
         {"color": 72, "typography": 60, "logo": 45, "imagery": 78, "voice": 70, "layout": 75}),
        ("Product_Landing_Redesign.fig", "application/octet-stream", 12_000_000, "completed", 88, "Product",
         {"color": 92, "typography": 90, "logo": 85, "imagery": 82, "voice": 88, "layout": 91}),
        ("Brand_Intro_30s_Cut.mp4", "video/mp4", 45_000_000, "completed", 41, "Video",
         {"color": 50, "typography": 35, "logo": 30, "imagery": 55, "voice": 38, "layout": 40}),
        ("Partner_Co-brand_Template.pdf", "application/pdf", 3_100_000, "completed", 73, "Partnerships",
         {"color": 80, "typography": 75, "logo": 60, "imagery": 78, "voice": 72, "layout": 73}),
    ]

    for filename, ftype, fsize, status, score, dept, cat_scores in scans:
        conn.execute(
            """INSERT INTO scans (filename, file_path, file_type, file_size, status,
               overall_score, category_scores, summary, department, scanned_by, completed_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)""",
            (
                filename, f"/uploads/{filename}", ftype, fsize, status,
                score, json.dumps(cat_scores),
                f"Compliance scan completed with score {score}/100.", dept,
            ),
        )

    # ── Sample Issues ──
    issues = [
        (2, "Incorrect logo lockup", "The horizontal logo is used in a vertical layout context, violating Section 3.2 of brand guidelines.", "logo", "high",
         "Swap to the stacked logo variant (assets/logo-stacked.svg) for vertical placements."),
        (2, "Off-brand color usage", "CTA button uses #4A90D9 instead of the primary brand blue #2B5CE6. Detected in 3 elements.", "color", "high",
         "Replace all CTA button fills with var(--brand-primary) or #2B5CE6."),
        (4, "Non-standard font weight", "Headline uses font-weight 800 (Extra Bold). Brand spec allows Regular (400) and Semibold (600) only.", "typography", "medium",
         "Change headline weight to 600 (Semibold) per typography guidelines."),
        (2, "Tone mismatch in copy", "Social post uses casual slang ('gonna', 'wanna') that conflicts with the brand's professional-yet-warm voice guidelines.", "voice", "low",
         "Rewrite using the approved conversational-but-polished voice. See tone guide Section 2.1."),
        (4, "Missing logo clear space", "The logo is placed within 10px of a text element. Minimum clear space requires 2x the lettermark height.", "logo", "high",
         "Add at least 48px of clear space around the logo."),
        (4, "Unapproved background", "Logo is placed on a busy gradient background without a container. Guidelines require a solid or semi-transparent container.", "logo", "medium",
         "Add a white or semi-transparent container behind the logo, minimum 16px padding."),
        (5, "Partner logo sizing", "Partner logo appears larger than the Brandguard logo in the co-brand layout.", "logo", "medium",
         "Ensure the Brandguard logo is at least equal in visual weight to partner logos."),
        (4, "Stock photo cliché", "The 'team meeting' image uses a generic stock photo with staged poses.", "imagery", "low",
         "Replace with authentic photography from the approved image library or commission new shots."),
        (3, "Spacing inconsistency", "Card padding uses 15px and 20px values that don't follow the 8px grid system.", "layout", "low",
         "Adjust card padding to 16px (2×8) or 24px (3×8) to align with the grid."),
        (2, "Font fallback issue", "Fraunces font fails to load, falling back to Times New Roman on some renders.", "typography", "high",
         "Ensure Fraunces is included as a web font with proper @font-face declarations and WOFF2 format."),
        (4, "Passive voice in CTA", "Main call-to-action reads 'Your brand can be protected' instead of using active voice.", "voice", "medium",
         "Rewrite to active voice: 'Protect your brand' or 'Start protecting your brand today'."),
        (5, "Low contrast text", "Body text (#9D9DAA) on light background (#F6F5F1) has a contrast ratio of 3.2:1, below the 4.5:1 minimum.", "color", "high",
         "Darken body text to at least #6B6B76 to meet WCAG AA contrast requirements."),
    ]

    for scan_id, title, desc, cat, sev, fix in issues:
        conn.execute(
            """INSERT INTO issues (scan_id, title, description, category, severity, suggested_fix)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (scan_id, title, desc, cat, sev, fix),
        )

    conn.commit()
    conn.close()
    print("✓ Database seeded with sample data")


if __name__ == "__main__":
    seed()
