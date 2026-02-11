# Brandguard — Brand Compliance Agent

AI-powered brand compliance tool that reviews creative assets against your brand guidelines using Gemini.

## Architecture

```
brandguard/
├── backend/                 # Python FastAPI server
│   ├── app/
│   │   ├── main.py          # App entry, CORS, router registration
│   │   ├── database.py      # SQLite models & connection
│   │   ├── auth_utils.py    # JWT tokens, password hashing
│   │   ├── claude_service.py # Gemini API integration
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── seed.py          # Sample data seeder
│   │   └── routers/
│   │       ├── auth.py      # Register, login, team
│   │       ├── guidelines.py # CRUD brand guidelines
│   │       ├── scans.py     # File upload + Gemini analysis
│   │       └── issues.py    # Issue tracking & resolution
│   ├── requirements.txt
│   └── uploads/             # Uploaded files (auto-created)
│
├── frontend/                # React + Vite
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/Sidebar.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── UploadPage.jsx
│   │   │   ├── IssuesPage.jsx
│   │   │   ├── GuidelinesPage.jsx
│   │   │   ├── TeamPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── hooks/useAuth.jsx
│   │   ├── utils/api.js
│   │   └── styles/global.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

## Features

- **Upload & Scan** — Drag-and-drop files (PDF, PNG, JPG, SVG, HTML, CSS). Gemini analyzes each against your brand guidelines.
- **Compliance Dashboard** — Overall score, assets compliant, open issues, avg resolution time, per-category breakdowns.
- **Issue Tracking** — Auto-generated issues from scans with severity, categories, and suggested fixes.
- **Brand Guidelines** — Full CRUD across 6 categories: color, typography, logo, imagery, voice & tone, layout.
- **Team Management** — JWT auth, roles (admin/manager/member), team assignments.

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Google Gemini API key (https://aistudio.google.com/app/apikey)

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
export GEMINI_API_KEY=your-api-key...
python -m app.seed        # Seed sample data (optional)
python -m app.main        # → http://localhost:8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev               # → http://localhost:3000
```

### 3. Open http://localhost:3000

**Demo login:** sarah@brandguard.io / password123

## How Scanning Works

1. User uploads a file via the Upload page
2. Backend saves the file and creates a scan record (status: pending)
3. Background task sends the file to Gemini with all stored brand guidelines
4. Gemini returns: overall score, per-category scores, and specific issues with suggested fixes
5. Scan updated to completed, issues stored in database
6. Frontend polls for completion and displays results

## API Endpoints

**Auth:** POST /api/auth/register, POST /api/auth/login, GET /api/auth/me, GET /api/auth/team

**Guidelines:** GET/POST /api/guidelines/, PATCH/DELETE /api/guidelines/:id, GET /api/guidelines/summary

**Scans:** POST /api/scans/upload, GET /api/scans/, GET /api/scans/dashboard, GET/DELETE /api/scans/:id

**Issues:** GET /api/issues/, GET /api/issues/stats, PATCH /api/issues/:id, POST /api/issues/:id/resolve

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| GEMINI_API_KEY | Yes | Google Gemini API key |
| JWT_SECRET | No | JWT signing secret (defaults to dev key) |

## Tech Stack

- **Frontend:** React 18, Vite, Lucide Icons
- **Backend:** FastAPI, SQLite, Anthropic Python SDK
- **AI:** Claude Sonnet 4 (Anthropic Messages API)
- **Auth:** JWT + PBKDF2 password hashing
- **Design:** Fraunces + DM Sans, warm corporate palette
