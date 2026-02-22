# HeyPoco Backend API

FastAPI backend for HeyPoco — voice-first personal life logger.

## Quick Start

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Copy env and fill in values
cp .env.example .env

# Run dev server
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transcribe` | Audio → text (Whisper) |
| POST | `/api/extract` | Text → structured fields (GPT-4o) |
| GET | `/api/entries` | List entries (filterable) |
| POST | `/api/entries` | Create entry |
| GET | `/api/entries/{id}` | Get single entry |
| PATCH | `/api/entries/{id}` | Update entry |
| DELETE | `/api/entries/{id}` | Delete entry |
| POST | `/api/query` | Ask a question (RAG) |
| GET | `/api/health` | Health check |

## API Docs
With the server running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
