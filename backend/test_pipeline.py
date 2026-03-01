"""
test_pipeline.py
----------------
Full end-to-end pipeline runner for HeyPoco ingestion.

Runs every step in sequence and prints the exact data produced + elapsed time
at each stage — all live in your terminal.

Pipeline
~~~~~~~~
  STEP 1  transcribe(audio)   → raw_text          [skipped for --text mode]
  STEP 2  detect_pii(text)    → clean_text         [local regex, instant]
  STEP 3  extract(clean_text) → type, entry_date,  [one GPT-4o call]
                                extracted_fields,
                                tags
  STEP 4  embed(text)         → vector[1536]       [skipped if PII found]
  STEP 5  INSERT into Supabase entries table

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO RUN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  cd backend                 # always run from /backend

  # Option A — typed text (fastest, no audio needed)
  python test_pipeline.py --text "Spent 60 dollars at Starbucks this morning"

  # Option B — audio file (full voice pipeline)
  python test_pipeline.py --audio path/to/recording.m4a

  # Option C — interactive (prompts you to type)
  python test_pipeline.py

  # With your timezone so entry_date is correct
  python test_pipeline.py --text "Dentist appointment today at 3pm" --tz "Asia/Kolkata"

  # Dry run — all steps run but nothing is written to the database
  python test_pipeline.py --text "Test entry" --dry-run

  # Test PII detection
  python test_pipeline.py --text "My SSN is 123-45-6789 and card is 4111 1111 1111 1111" --dry-run

REQUIRES
  backend/.env  with  OPENAI_API_KEY  and  SUPABASE_* keys.
  Set TEST_USER_ID env var (or --user-id flag) to a real Supabase user UUID
  when --dry-run is NOT used (otherwise the insert will fail RLS).
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Bootstrap: load .env, fix sys.path so "app.*" imports resolve
# ---------------------------------------------------------------------------

_BACKEND_DIR = Path(__file__).parent.resolve()
load_dotenv(_BACKEND_DIR / ".env")
sys.path.insert(0, str(_BACKEND_DIR))

# ---------------------------------------------------------------------------
# Service imports — same modules used by the real FastAPI app
# ---------------------------------------------------------------------------

from app.services.transcription_service import (
    TranscriptionError,
    UnsupportedAudioFormatError,
    transcribe,
)
from app.services.pii_service import detect_pii
from app.services.extraction_service import ExtractionError, extract
from app.services.embedding_service import (
    EMBEDDING_DIMENSIONS,
    EmbeddingError,
    EmptyTextError,
    embed,
)
from app.services.supabase_service import create_entry


# ---------------------------------------------------------------------------
# Terminal colour helpers — no external lib required
# ---------------------------------------------------------------------------

BOLD   = "\033[1m"
DIM    = "\033[2m"
GREEN  = "\033[32m"
YELLOW = "\033[33m"
CYAN   = "\033[36m"
RED    = "\033[31m"
WHITE  = "\033[97m"
RESET  = "\033[0m"


def col(text: str, *codes: str) -> str:
    """Wrap text in ANSI codes."""
    return "".join(codes) + text + RESET


def rule(char: str = "─", width: int = 64) -> str:
    return char * width


# ---------------------------------------------------------------------------
# Print helpers
# ---------------------------------------------------------------------------


def step_header(n: int, total: int, title: str, sub: str = "") -> None:
    """Bold separator printed before each pipeline stage."""
    print()
    print(col(rule("━"), BOLD, CYAN))
    print(col(f"  STEP {n}/{total}  {title}", BOLD, WHITE))
    if sub:
        print(col(f"  {sub}", DIM))
    print(col(rule("─"), DIM))


def kv(key: str, value: object, indent: int = 4) -> None:
    """Cyan key + value row."""
    print(f"{' ' * indent}{col(key + ':', CYAN)}  {value}")


def ok(msg: str) -> None:
    print(col(f"\n  ✓  {msg}", GREEN, BOLD))


def warn(msg: str) -> None:
    print(col(f"\n  ⚠  {msg}", YELLOW))


def fail(msg: str) -> None:
    print(col(f"\n  ✗  {msg}", RED, BOLD))


def elapsed_str(s: float) -> str:
    return col(f"({s:.2f}s)", DIM)


def timing_bar(label: str, seconds: float, max_s: float) -> str:
    """Mini ASCII bar showing relative time cost."""
    ratio = seconds / max(max_s, 0.001)
    filled = int(min(ratio, 1.0) * 20)
    bar = "█" * filled + "░" * (20 - filled)
    return f"  {label:<30} [{bar}] {seconds:.2f}s"


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------


def today_iso(tz: str) -> str:
    """Today's date as an ISO string in the given IANA timezone."""
    try:
        from zoneinfo import ZoneInfo
        now = datetime.now(ZoneInfo(tz))
    except (KeyError, ImportError):
        now = datetime.now(timezone.utc)
    return now.date().isoformat()


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------


async def run_pipeline(
    *,
    audio_path: Path | None,
    text_input: str | None,
    user_tz: str,
    dry_run: bool,
    user_id: str,
) -> None:
    """Execute all pipeline steps and print live output + timing."""

    timing: dict[str, float] = {}
    total_steps = 5
    step = 0

    # ── Header ──────────────────────────────────────────────────────
    print()
    print(col(rule("═"), BOLD, CYAN))
    print(col("  HeyPoco — Full Ingestion Pipeline Test", BOLD, WHITE))
    print(col(rule("═"), BOLD, CYAN))
    print(col(f"\n  Mode       : {'VOICE' if audio_path else 'TEXT'}", DIM))
    print(col(f"  Timezone   : {user_tz}", DIM))
    print(col(f"  Today      : {today_iso(user_tz)}", DIM))
    print(col(f"  Dry run    : {dry_run}", DIM))
    print(col(f"  User ID    : {user_id[:8]}…", DIM))

    # ════════════════════════════════════════════════════════════════
    # STEP 1 — Transcription  (voice) or Input display (text)
    # ════════════════════════════════════════════════════════════════
    step += 1

    if audio_path:
        step_header(step, total_steps, "Transcription", "OpenAI Whisper → raw text")
        size_kb = audio_path.stat().st_size / 1024
        kv("File", audio_path.name)
        kv("Size", f"{size_kb:.1f} KB")

        t0 = time.perf_counter()
        try:
            raw_text: str = await transcribe(audio_path)
        except UnsupportedAudioFormatError as exc:
            fail(f"Unsupported format: {exc}")
            sys.exit(1)
        except TranscriptionError as exc:
            fail(f"Transcription failed: {exc}")
            sys.exit(1)
        elapsed = time.perf_counter() - t0
        timing["1_transcribe"] = elapsed

        print(col("\n  ┌─ Transcription result ", BOLD, GREEN))
        print()
        for line in raw_text.splitlines():
            print(f'    "{line}"')
        print()
        kv("Characters", len(raw_text))
        kv("Words (approx)", len(raw_text.split()))
        ok(f"Transcription done {elapsed_str(elapsed)}")

    else:
        raw_text = text_input  # guaranteed non-empty from main()
        step_header(step, total_steps, "Input (text mode)", "No transcription API call")
        print(col("\n  ┌─ Raw text ", BOLD, GREEN))
        print(f'\n    "{raw_text}"\n')
        kv("Characters", len(raw_text))
        timing["1_transcribe"] = 0.0

    # ════════════════════════════════════════════════════════════════
    # STEP 2 — PII Detection  (local regex, no API)
    # ════════════════════════════════════════════════════════════════
    step += 1
    step_header(step, total_steps, "PII Detection", "Local regex — zero API calls")

    t0 = time.perf_counter()
    pii_result = detect_pii(raw_text)
    elapsed = time.perf_counter() - t0
    timing["2_pii"] = elapsed

    print(col("\n  ┌─ PII scan result ", BOLD, GREEN))
    print()
    has_pii_label = (
        col("True  → entry will be stored with is_sensitive=True", RED, BOLD)
        if pii_result.has_pii
        else col("False → safe to send to external APIs", GREEN)
    )
    kv("has_pii",    has_pii_label)
    kv("pii_types",  pii_result.pii_types or "(none detected)")
    kv("clean_text", f'"{pii_result.clean_text}"')

    if pii_result.has_pii:
        warn("PII found — embedding (STEP 4) will be SKIPPED to protect privacy")
    ok(f"PII scan done {elapsed_str(elapsed)}")

    # ════════════════════════════════════════════════════════════════
    # STEP 3 — GPT-4o Extraction
    # ════════════════════════════════════════════════════════════════
    step += 1
    step_header(step, total_steps, "Extraction", "GPT-4o → type, entry_date, fields, tags")
    kv("Input", f'"{pii_result.clean_text[:80]}{"…" if len(pii_result.clean_text) > 80 else ""}"')
    kv("Today", today_iso(user_tz))
    kv("Timezone", user_tz)
    print()

    extraction_failed = False
    t0 = time.perf_counter()
    try:
        extraction = await extract(
            clean_text=pii_result.clean_text,
            current_date=today_iso(user_tz),
            timezone=user_tz,
        )
        entry_type       = extraction.type
        entry_date       = extraction.entry_date
        extracted_fields = extraction.extracted_fields
        tags             = extraction.tags
    except ExtractionError as exc:
        extraction_failed = True
        warn(f"Extraction failed: {exc}")
        warn("Falling back to type=general, empty fields (entry still saves)")
        entry_type       = "general"
        entry_date       = today_iso(user_tz)
        extracted_fields = {}
        tags             = []
    elapsed = time.perf_counter() - t0
    timing["3_extract"] = elapsed

    print(col("  ┌─ Extraction result ", BOLD, GREEN))
    print()
    kv("type",        col(entry_type.upper(), BOLD, YELLOW))
    kv("entry_date",  entry_date)
    kv("tags",        tags)
    print()
    if extracted_fields:
        print(col("    extracted_fields:", CYAN))
        for k, v in extracted_fields.items():
            print(f"      {col(k, CYAN)}: {v}")
    else:
        print(col("    extracted_fields: (empty)", DIM))

    if extraction_failed:
        warn(f"Used fallback values {elapsed_str(elapsed)}")
    else:
        ok(f"Extraction done {elapsed_str(elapsed)}")

    # ════════════════════════════════════════════════════════════════
    # STEP 4 — Embedding
    # ════════════════════════════════════════════════════════════════
    step += 1
    step_header(step, total_steps, "Embedding", "text-embedding-3-small → 1536 floats")

    embedding: list[float] | None = None

    if pii_result.has_pii:
        warn("SKIPPED — sensitive entry, embedding set to null")
        print(col("  SQL filter search still works; only vector search is disabled.\n", DIM))
        timing["4_embed"] = 0.0
    else:
        t0 = time.perf_counter()
        try:
            embedding = await embed(raw_text)
        except (EmptyTextError, EmbeddingError) as exc:
            warn(f"Embedding failed (non-fatal, entry still saves): {exc}")
        elapsed = time.perf_counter() - t0
        timing["4_embed"] = elapsed

        if embedding:
            print(col("\n  ┌─ Embedding result ", BOLD, GREEN))
            print()
            kv("Dimensions", f"{len(embedding)}  (expected {EMBEDDING_DIMENSIONS})")
            kv("First 8   ", [round(v, 4) for v in embedding[:8]])
            kv("Last  8   ", [round(v, 4) for v in embedding[-8:]])
            kv("Min value ", round(min(embedding), 4))
            kv("Max value ", round(max(embedding), 4))
            non_zero = sum(1 for v in embedding if v != 0.0)
            kv("Non-zero  ", f"{non_zero} / {len(embedding)}")
            ok(f"Embedding done {elapsed_str(elapsed)}")

    # ════════════════════════════════════════════════════════════════
    # STEP 5 — Supabase INSERT
    # ════════════════════════════════════════════════════════════════
    step += 1
    step_header(step, total_steps, "Database Insert", "Supabase → entries table")

    print(col("\n  ┌─ Payload preview ", BOLD, CYAN))
    print()
    kv("user_id",          f"{user_id[:8]}…")
    kv("type",             col(entry_type, YELLOW))
    kv("raw_text",         f'"{raw_text[:60]}{"…" if len(raw_text) > 60 else ""}"')
    kv("entry_date",       entry_date)
    kv("is_sensitive",     col(str(pii_result.has_pii), RED if pii_result.has_pii else GREEN))
    kv("pii_types",        pii_result.pii_types or [])
    kv("tags",             tags)
    kv("extracted_fields", extracted_fields or "(empty)")
    kv("source",           "voice" if audio_path else "text")
    kv("embedding",        f"[{EMBEDDING_DIMENSIONS} floats]" if embedding else col("null", DIM))

    if dry_run:
        print()
        warn("DRY RUN — insert skipped.  Run without --dry-run to persist.")
        timing["5_insert"] = 0.0
    else:
        print()
        t0 = time.perf_counter()
        try:
            saved = await create_entry(
                user_id=user_id,
                entry_type=entry_type,
                raw_text=raw_text,
                extracted_fields=extracted_fields,
                tags=tags,
                embedding=embedding,
                entry_date=entry_date,
                source="voice" if audio_path else "text",
                is_sensitive=pii_result.has_pii,
                pii_types=pii_result.pii_types,
            )
        except Exception as exc:
            fail(f"Database insert failed: {exc}")
            sys.exit(1)
        elapsed = time.perf_counter() - t0
        timing["5_insert"] = elapsed

        print(col("  ┌─ Saved entry (echoed from Supabase) ", BOLD, GREEN))
        print()
        kv("id",          col(str(saved.get("id")), BOLD))
        kv("type",        col(str(saved.get("type", "?")).upper(), BOLD, YELLOW))
        kv("entry_date",  saved.get("entry_date"))
        kv("is_sensitive",saved.get("is_sensitive"))
        kv("created_at",  saved.get("created_at"))
        kv("tags",        saved.get("tags"))
        ok(f"Inserted into Supabase {elapsed_str(elapsed)}")

    # ════════════════════════════════════════════════════════════════
    # Summary
    # ════════════════════════════════════════════════════════════════
    print()
    print(col(rule("═"), BOLD, CYAN))
    print(col("  TIMING SUMMARY", BOLD, WHITE))
    print(col(rule("─"), DIM))

    labels = {
        "1_transcribe": "1. Transcription (Whisper)",
        "2_pii":        "2. PII Detection (local)",
        "3_extract":    "3. Extraction (GPT-4o)",
        "4_embed":      "4. Embedding",
        "5_insert":     "5. Database insert",
    }
    total_time = sum(timing.values())
    for key, label in labels.items():
        t = timing.get(key)
        if t is not None:
            print(timing_bar(label, t, max_s=max(total_time, 0.001)))
    print(col(rule("─"), DIM))
    print(timing_bar("TOTAL", total_time, max_s=max(total_time, 0.001)))

    print()
    print(col("  RESULT", BOLD, WHITE))
    print(col(rule("─"), DIM))
    print(f"  {'type':<18} {col(entry_type.upper(), BOLD, YELLOW)}")
    print(f"  {'entry_date':<18} {entry_date}")
    print(f"  {'tags':<18} {tags}")
    pii_str = (col("Yes — is_sensitive=True, no embedding", RED)
               if pii_result.has_pii else col("No", GREEN))
    print(f"  {'PII detected':<18} {pii_str}")
    emb_str = (col(f"Yes ({EMBEDDING_DIMENSIONS} dims)", GREEN)
               if embedding else col("No", YELLOW))
    print(f"  {'has_embedding':<18} {emb_str}")
    print()

    if dry_run:
        print(col("  DRY RUN — nothing written to the database", YELLOW, BOLD))
    else:
        print(col("  Entry saved to Supabase ✓", GREEN, BOLD))

    print(col(rule("═"), BOLD, CYAN))
    print()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="python test_pipeline.py",
        description="HeyPoco full ingestion pipeline tester",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            '  python test_pipeline.py\n'
            '  python test_pipeline.py --text "Spent $60 at Starbucks"\n'
            '  python test_pipeline.py --text "Dentist at 3pm tomorrow" --tz "Asia/Kolkata"\n'
            '  python test_pipeline.py --audio recording.m4a\n'
            '  python test_pipeline.py --text "Test" --dry-run\n'
            '  python test_pipeline.py --text "My SSN is 123-45-6789" --dry-run\n'
        ),
    )
    src = p.add_mutually_exclusive_group()
    src.add_argument(
        "--text", "-t",
        metavar="TEXT",
        help='Entry as typed text, e.g. --text "Spent $60 at Starbucks"',
    )
    src.add_argument(
        "--audio", "-a",
        metavar="FILE",
        help="Path to audio file (mp3, mp4, wav, m4a, webm)",
    )
    p.add_argument(
        "--tz",
        metavar="TIMEZONE",
        default="UTC",
        help='IANA timezone, e.g. "Asia/Kolkata"  (default: UTC)',
    )
    p.add_argument(
        "--user-id",
        dest="user_id",
        metavar="UUID",
        # Default UUID = kshitij test user (matches seed.sql + dev router).
        # Override with --user-id or by setting TEST_USER_ID env var.
        default=os.environ.get("TEST_USER_ID", "af3dfe06-a4e0-4251-bd80-d4a1058bae11"),
        help="Supabase user UUID  (default: kshitij test user — matches seed.sql)",
    )
    p.add_argument(
        "--dry-run",
        dest="dry_run",
        action="store_true",
        help="Skip the Supabase insert — all other steps still run",
    )
    return p


def main() -> None:
    args = build_parser().parse_args()

    audio_path: Path | None = None
    text_input: str | None = None

    if args.audio:
        audio_path = Path(args.audio).expanduser().resolve()
        if not audio_path.exists():
            fail(f"Audio file not found: {audio_path}")
            sys.exit(1)
    elif args.text:
        text_input = args.text.strip()
        if not text_input:
            fail("--text cannot be empty")
            sys.exit(1)
    else:
        # Interactive mode
        print(col("\n  HeyPoco Pipeline Test — Interactive Mode", BOLD, CYAN))
        print(col("  Type your entry and press Enter:\n", DIM))
        try:
            text_input = input("  > ").strip()
        except (KeyboardInterrupt, EOFError):
            print()
            sys.exit(0)
        if not text_input:
            fail("Input cannot be empty")
            sys.exit(1)

    asyncio.run(
        run_pipeline(
            audio_path=audio_path,
            text_input=text_input,
            user_tz=args.tz,
            dry_run=args.dry_run,
            user_id=args.user_id,
        )
    )


if __name__ == "__main__":
    main()
