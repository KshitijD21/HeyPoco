#!/usr/bin/env bash
# ============================================================================
# seed_retrieval.sh — Seed test data through the API (gets real embeddings)
# ============================================================================
#
# Requires: backend running with DEBUG=true on port 8000
#   cd backend && DEBUG=true venv/bin/uvicorn app.main:app --reload
#
# Usage:  bash scripts/seed_retrieval.sh
# ============================================================================

set -euo pipefail

API="http://localhost:8000/api/dev/ingest"
OK=0
FAIL=0

ingest() {
  local text="$1"
  local short="${text:0:50}"

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$API" \
    -F "raw_text=$text" \
    -F "user_timezone=Asia/Kolkata")

  if [ "$HTTP_CODE" = "201" ]; then
    echo "  [OK]  $short..."
    OK=$((OK + 1))
  else
    echo "  [FAIL:$HTTP_CODE]  $short..."
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "=== HeyPoco Retrieval Test Seed ==="
echo "Ingesting 14 entries through the API..."
echo "Each entry gets transcribed, extracted, and embedded."
echo ""

# Finance (5)
echo "── Finance ──"
ingest "Spent 60 dollars at Starbucks this morning"
ingest "Paid 20 bucks at H&M for a t-shirt"
ingest "Uber ride to office cost me 15 dollars"
ingest "Lunch at Subway was 12 dollars"
ingest "Bought groceries at Whole Foods for 85 dollars"

# Journal (2)
echo "── Journal ──"
ingest "Today was amazing, felt super focused and finished the HeyPoco backend"
ingest "Feeling a bit low today, didn't sleep well last night"

# Task (2)
echo "── Task ──"
ingest "Send the contract to Sarah by Friday"
ingest "Need to review the PR from Ahmed before EOD"

# Event (1)
echo "── Event ──"
ingest "Dentist appointment tomorrow at 3pm"

# Note (2)
echo "── Note ──"
ingest "Ahmed is moving to Dubai next month, should catch up before he leaves"
ingest "Had a great call with mom today, she seems happy about the new house"

# Health (1)
echo "── Health ──"
ingest "Headache all morning, took paracetamol around 10am"

# PII (1)
echo "── PII ──"
ingest "My SSN is 123-45-6789"

echo ""
echo "=== Done! OK=$OK  FAIL=$FAIL ==="
echo ""
echo "Now test retrieval at: http://localhost:3000/test/query"
echo "Or via curl:"
echo '  curl -X POST http://localhost:8000/api/dev/query -H "Content-Type: application/json" -d '"'"'{"question":"How much did I spend this week?"}'"'"''
