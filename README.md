# HeyPoco

> **Speak your life once, access it anytime.**

A voice-first personal life logger. Speak naturally — the app understands, remembers, and reflects it back intelligently.

## Architecture

```
┌─────────────────┐     REST API     ┌─────────────────┐
│   Next.js 14    │ ──────────────── │    FastAPI       │
│   (Frontend)    │                  │    (Backend)     │
│                 │                  │                  │
│  • UI / Auth    │                  │  • Whisper       │
│  • React Query  │                  │  • GPT-4o        │
│  • Zustand      │                  │  • Embeddings    │
└────────┬────────┘                  └────────┬────────┘
         │ Auth only                          │
         └──────────┐  ┌─────────────────────┘
                    ▼  ▼
              ┌──────────────┐
              │   Supabase   │
              │ PostgreSQL   │
              │ + Auth       │
              │ + pgvector   │
              └──────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase account
- OpenAI API key

### 1. Clone & Install

```bash
git clone https://github.com/anirudh3699/HeyPoco.git
cd HeyPoco
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Fill in your Supabase and OpenAI credentials

uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install

cp .env.local.example .env.local
# Fill in your Supabase URL and anon key

npm run dev
```

### 4. Database Setup

1. Create a new Supabase project
2. Enable the `vector` extension in SQL Editor
3. Run the migration files in order from `supabase/migrations/`
4. Or run the full snapshot: `supabase/schema.sql`

### 5. Open the App

- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs

## Project Structure

```
HeyPoco/
├── .project/          ← Project tracking (backlog, bugs, changelog, ADRs)
├── backend/           ← FastAPI (Python) — AI processing + data
├── frontend/          ← Next.js 14 (TypeScript) — UI
├── supabase/          ← Database schema + migrations
├── HeyPoco Docs/      ← Product documentation
└── README.md          ← You are here
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| State | React Query (server) + Zustand (client) |
| Backend | FastAPI, Python 3.11+ |
| AI | OpenAI Whisper, GPT-4o, text-embedding-3-small |
| Database | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase Auth (JWT) |
| Validation | Zod (frontend) + Pydantic (backend) |

## Documentation

See `HeyPoco Docs/` for full product documentation including the MVP PRD.

## License

Private — All rights reserved.
