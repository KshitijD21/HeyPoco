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

## Testing the Pipeline Locally

### 1. Start the backend in debug mode
```bash
DEBUG=true uvicorn app.main:app --reload --port 8000
```
This activates the no-auth dev endpoint at `POST /api/dev/ingest`.

### 2. Create a test user
- Go to Supabase Dashboard → **Authentication → Users → Add user**
- Use any email/password. Copy the UUID it assigns.
- Create a profile row in SQL Editor:
  ```sql
  INSERT INTO public.profiles (id, email, display_name, timezone)
  VALUES ('<your-uuid>', '<your-email>', '<your-name>', 'UTC')
  ON CONFLICT (id) DO NOTHING;
  ```

### 3. Set your user ID
Add to `backend/.env`:
```
TEST_USER_ID=<your-uuid>
```
This is picked up by `test_pipeline.py` automatically.

### 4. Test via browser
Start the frontend:
```bash
cd ../frontend && pnpm dev
```
Open **http://localhost:3000/test** — record voice or type text, see the full pipeline run.

### 5. Test via terminal
```bash
python test_pipeline.py --text "Spent $60 at Starbucks" --dry-run   # skip DB
python test_pipeline.py --text "Spent $60 at Starbucks"             # saves to DB
python test_pipeline.py --audio recording.wav
```
