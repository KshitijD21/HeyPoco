# HeyPoco — Seed Data & Test Pages

## Before You Begin

> **Important:** Replace every occurrence of `af3dfe06-a4e0-4251-bd80-d4a1058bae11` in the SQL below with your own authenticated user UUID.
> You can find your UUID in the Supabase Dashboard under **Authentication → Users**.

---

## Seed Data (No Embeddings — SQL Only)

Run the following SQL in the **Supabase Dashboard → SQL Editor**.

```sql
-- ============================================================================
-- HeyPoco — Clean Seed Data (No Embeddings — SQL paths only)
-- Replace <YOUR_USER_UUID> with your actual authenticated user UUID
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================================

-- Step 1: Fix timezone (was UTC, should be America/Phoenix)
UPDATE public.profiles
SET timezone = 'America/Phoenix'
WHERE id = '<YOUR_USER_UUID>';

-- Step 2: Wipe ALL existing entries for clean slate
DELETE FROM public.entries
WHERE user_id = '<YOUR_USER_UUID>';

-- ============================================================================
-- FINANCE ENTRIES (7)
-- ============================================================================

INSERT INTO public.entries
  (user_id, source, type, raw_text, extracted_fields, tags, entry_date, is_sensitive, pii_types)
VALUES

-- Today
(
  '<YOUR_USER_UUID>', 'voice', 'finance',
  'Spent 60 dollars at Starbucks this morning',
  '{"amount": 60, "currency": "USD", "merchant": "Starbucks", "category": "food & drink"}',
  ARRAY['coffee', 'starbucks', 'food'],
  NOW() - INTERVAL '2 hours',
  false, ARRAY[]::TEXT[]
),
(
  '<YOUR_USER_UUID>', 'voice', 'finance',
  'Grabbed lunch at Chipotle, paid 14 dollars',
  '{"amount": 14, "currency": "USD", "merchant": "Chipotle", "category": "food & drink"}',
  ARRAY['lunch', 'chipotle', 'food'],
  NOW() - INTERVAL '4 hours',
  false, ARRAY[]::TEXT[]
),

-- Yesterday
(
  '<YOUR_USER_UUID>', 'text', 'finance',
  'Lunch at Subway was 12 dollars',
  '{"amount": 12, "currency": "USD", "merchant": "Subway", "category": "food & drink"}',
  ARRAY['lunch', 'subway', 'food'],
  NOW() - INTERVAL '1 day',
  false, ARRAY[]::TEXT[]
),
(
  '<YOUR_USER_UUID>', 'voice', 'finance',
  'Paid 20 bucks at H&M for a t-shirt',
  '{"amount": 20, "currency": "USD", "merchant": "H&M", "category": "shopping"}',
  ARRAY['shopping', 'clothes', 'hm'],
  NOW() - INTERVAL '1 day',
  false, ARRAY[]::TEXT[]
),

-- 3 days ago
(
  '<YOUR_USER_UUID>', 'voice', 'finance',
  'Uber ride to office cost me 15 dollars',
  '{"amount": 15, "currency": "USD", "merchant": "Uber", "category": "transport"}',
  ARRAY['uber', 'transport', 'commute'],
  NOW() - INTERVAL '3 days',
  false, ARRAY[]::TEXT[]
),

-- 5 days ago
(
  '<YOUR_USER_UUID>', 'voice', 'finance',
  'Bought groceries at Whole Foods for 85 dollars',
  '{"amount": 85, "currency": "USD", "merchant": "Whole Foods", "category": "food & drink"}',
  ARRAY['groceries', 'whole-foods', 'food'],
  NOW() - INTERVAL '5 days',
  false, ARRAY[]::TEXT[]
),

-- 6 days ago
(
  '<YOUR_USER_UUID>', 'text', 'finance',
  'Netflix subscription renewed for 15 dollars',
  '{"amount": 15, "currency": "USD", "merchant": "Netflix", "category": "entertainment"}',
  ARRAY['netflix', 'subscription', 'entertainment'],
  NOW() - INTERVAL '6 days',
  false, ARRAY[]::TEXT[]
);

-- ============================================================================
-- JOURNAL ENTRIES (3)
-- ============================================================================

INSERT INTO public.entries
  (user_id, source, type, raw_text, extracted_fields, tags, entry_date, is_sensitive, pii_types)
VALUES

-- Today
(
  '<YOUR_USER_UUID>', 'voice', 'journal',
  'Today was solid, knocked out the retrieval pipeline and feeling really good about the project direction',
  '{"mood": "positive", "energy": "high", "highlights": ["finished retrieval pipeline"]}',
  ARRAY['productive', 'heypoco', 'coding'],
  NOW() - INTERVAL '1 hour',
  false, ARRAY[]::TEXT[]
),

-- 2 days ago
(
  '<YOUR_USER_UUID>', 'voice', 'journal',
  'Today was amazing, felt super focused and finished the HeyPoco backend',
  '{"mood": "positive", "energy": "high", "highlights": ["finished HeyPoco backend"]}',
  ARRAY['productive', 'coding', 'heypoco'],
  NOW() - INTERVAL '2 days',
  false, ARRAY[]::TEXT[]
),

-- 4 days ago
(
  '<YOUR_USER_UUID>', 'voice', 'journal',
  'Feeling a bit low today, did not sleep well last night',
  '{"mood": "negative", "energy": "low"}',
  ARRAY['tired', 'sleep', 'low-energy'],
  NOW() - INTERVAL '4 days',
  false, ARRAY[]::TEXT[]
);

-- ============================================================================
-- TASK ENTRIES (4)
-- ============================================================================

INSERT INTO public.entries
  (user_id, source, type, raw_text, extracted_fields, tags, entry_date, is_sensitive, pii_types)
VALUES

-- Today
(
  '<YOUR_USER_UUID>', 'voice', 'task',
  'Need to review the PR from Ahmed before EOD',
  '{"action": "review PR from Ahmed", "person": "Ahmed", "status": "open"}',
  ARRAY['pr-review', 'ahmed', 'code'],
  NOW() - INTERVAL '3 hours',
  false, ARRAY[]::TEXT[]
),
(
  '<YOUR_USER_UUID>', 'voice', 'task',
  'Send the project proposal to professor by Thursday',
  '{"action": "send project proposal to professor", "person": "professor", "deadline": "2026-03-12", "status": "open"}',
  ARRAY['proposal', 'professor', 'deadline'],
  NOW() - INTERVAL '5 hours',
  false, ARRAY[]::TEXT[]
),

-- Yesterday
(
  '<YOUR_USER_UUID>', 'text', 'task',
  'Send the contract to Sarah by Friday',
  '{"action": "send the contract to Sarah", "person": "Sarah", "deadline": "2026-03-13", "status": "open"}',
  ARRAY['contract', 'sarah', 'deadline'],
  NOW() - INTERVAL '1 day',
  false, ARRAY[]::TEXT[]
),

-- 3 days ago
(
  '<YOUR_USER_UUID>', 'voice', 'task',
  'Follow up with Ronak about the hackathon submission',
  '{"action": "follow up with Ronak about hackathon", "person": "Ronak", "status": "open"}',
  ARRAY['ronak', 'hackathon', 'followup'],
  NOW() - INTERVAL '3 days',
  false, ARRAY[]::TEXT[]
);

-- ============================================================================
-- EVENT ENTRIES (3)
-- ============================================================================

INSERT INTO public.entries
  (user_id, source, type, raw_text, extracted_fields, tags, entry_date, is_sensitive, pii_types)
VALUES

-- Today (future event)
(
  '<YOUR_USER_UUID>', 'text', 'event',
  'Dentist appointment tomorrow at 3pm',
  '{"title": "Dentist appointment", "scheduled_at": "2026-03-11T15:00:00"}',
  ARRAY['dentist', 'appointment', 'health'],
  NOW(),
  false, ARRAY[]::TEXT[]
),

-- Yesterday
(
  '<YOUR_USER_UUID>', 'voice', 'event',
  'Team standup meeting went well, synced on sprint goals',
  '{"title": "Team standup", "scheduled_at": "2026-03-09T10:00:00"}',
  ARRAY['standup', 'meeting', 'team'],
  NOW() - INTERVAL '1 day',
  false, ARRAY[]::TEXT[]
),

-- 5 days ago
(
  '<YOUR_USER_UUID>', 'voice', 'event',
  'Had the ASU advising session at 2pm, got my graduation audit done',
  '{"title": "ASU advising session", "scheduled_at": "2026-03-05T14:00:00"}',
  ARRAY['asu', 'advising', 'graduation'],
  NOW() - INTERVAL '5 days',
  false, ARRAY[]::TEXT[]
);

-- ============================================================================
-- NOTE ENTRIES (4)
-- ============================================================================

INSERT INTO public.entries
  (user_id, source, type, raw_text, extracted_fields, tags, entry_date, is_sensitive, pii_types)
VALUES

-- Today
(
  '<YOUR_USER_UUID>', 'voice', 'note',
  'Ahmed is moving to Dubai next month, should catch up before he leaves',
  '{"person": "Ahmed", "topic": "life update", "people": ["Ahmed"]}',
  ARRAY['ahmed', 'dubai', 'moving'],
  NOW() - INTERVAL '2 hours',
  false, ARRAY[]::TEXT[]
),

-- Yesterday
(
  '<YOUR_USER_UUID>', 'text', 'note',
  'Had a great call with mom today, she seems happy about the new house',
  '{"person": "Mom", "topic": "family", "people": ["Mom"]}',
  ARRAY['mom', 'family', 'call'],
  NOW() - INTERVAL '1 day',
  false, ARRAY[]::TEXT[]
),

-- 2 days ago
(
  '<YOUR_USER_UUID>', 'voice', 'note',
  'Ronak mentioned a new AI startup idea, something about automating code reviews',
  '{"person": "Ronak", "topic": "startup idea", "people": ["Ronak"]}',
  ARRAY['ronak', 'startup', 'ai'],
  NOW() - INTERVAL '2 days',
  false, ARRAY[]::TEXT[]
),

-- 6 days ago
(
  '<YOUR_USER_UUID>', 'voice', 'note',
  'Professor mentioned the Feynman lectures, should look those up',
  '{"person": "professor", "topic": "book recommendation", "people": ["professor"]}',
  ARRAY['feynman', 'books', 'professor'],
  NOW() - INTERVAL '6 days',
  false, ARRAY[]::TEXT[]
);

-- ============================================================================
-- HEALTH ENTRIES (2)
-- ============================================================================

INSERT INTO public.entries
  (user_id, source, type, raw_text, extracted_fields, tags, entry_date, is_sensitive, pii_types)
VALUES

-- 2 days ago
(
  '<YOUR_USER_UUID>', 'voice', 'health',
  'Headache all morning, took paracetamol around 10am',
  '{"symptom": "headache", "medication": "paracetamol", "time": "10:00"}',
  ARRAY['headache', 'paracetamol', 'morning'],
  NOW() - INTERVAL '2 days',
  false, ARRAY[]::TEXT[]
),

-- 5 days ago
(
  '<YOUR_USER_UUID>', 'voice', 'health',
  'Feeling tired and sore after the gym, drank a lot of water',
  '{"symptom": "soreness", "medication": null, "energy": "low"}',
  ARRAY['gym', 'soreness', 'tired'],
  NOW() - INTERVAL '5 days',
  false, ARRAY[]::TEXT[]
);

-- ============================================================================
-- PII ENTRY — sensitive, never embedded, never in search
-- ============================================================================

INSERT INTO public.entries
  (user_id, source, type, raw_text, extracted_fields, tags, entry_date, is_sensitive, pii_types, embedding)
VALUES
(
  '<YOUR_USER_UUID>', 'text', 'general',
  'My SSN is 123-45-6789',
  '{}',
  ARRAY['pii-test'],
  NOW() - INTERVAL '5 days',
  true, ARRAY['ssn'],
  NULL
);

-- ============================================================================
-- VERIFY — run this after insert to confirm all rows were inserted
-- ============================================================================

SELECT
  type,
  raw_text,
  entry_date::date AS date,
  extracted_fields->>'amount' AS amount,
  extracted_fields->>'person' AS person,
  CASE WHEN embedding IS NULL THEN 'no embedding' ELSE 'has embedding' END AS embed_status,
  is_sensitive
FROM public.entries
WHERE user_id = '<YOUR_USER_UUID>'
ORDER BY entry_date DESC;
```

---

## Test Pages

Make sure the frontend dev server is running (`pnpm dev` inside `frontend/`), then open the following pages at `http://localhost:3000`.

### `/test` — Ingestion Pipeline

Tests the full ingestion flow: **voice/text input → PII detection → field extraction → embedding → database insert**.

- Use the quick test buttons to submit sample entries, or type your own text.
- Check the response to see extracted fields, tags, PII flags, and embedding status.

**URL:** `http://localhost:3000/test`

---

### `/test/query` — Retrieval Pipeline

Tests the full retrieval flow: **natural language question → query classification → vector retrieval → answer synthesis**.

- Use the quick test buttons for pre-written sample questions, or type any question in the input.
- Check the response to see the query class, retrieved entries, and the synthesized answer.

**URL:** `http://localhost:3000/test/query`

---

> Both pages are cross-linked — you can navigate between them directly from each page.
