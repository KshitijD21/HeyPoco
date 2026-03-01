"""
pii_service.py
--------------
Single responsibility: detect and redact Personally Identifiable Information
(PII) from raw text using **local regex only** — zero API calls.

This service MUST run before any external service (GPT-4o, embeddings)
sees the user's text.  If PII is found the text is redacted in-place and
the caller is told which PII types were detected so downstream steps can
set ``is_sensitive = True`` and skip embedding.

Public surface
--------------
    detect_pii(raw_text: str) -> PIIResult

Dataclass
---------
    PIIResult — holds clean_text, has_pii flag, and list of detected types.

No dependencies beyond the Python standard library.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Tuple


# ---------------------------------------------------------------------------
# Output dataclass — typed alternative to returning a raw dict
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PIIResult:
    """
    Immutable result of a PII scan.

    Attributes:
        clean_text: The input text with every detected PII token replaced
                    by a placeholder like ``[SSN_REDACTED]``.
        has_pii:    ``True`` if at least one PII pattern matched.
        pii_types:  List of PII category strings that were found,
                    e.g. ``["ssn", "phone"]``.  Empty when ``has_pii``
                    is ``False``.
    """

    clean_text: str
    has_pii: bool
    pii_types: List[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# PII regex patterns — grouped by region
# ---------------------------------------------------------------------------

# Each key is a short, stable identifier used throughout the codebase
# (stored in entries.pii_types, logged in audit trails, etc.).
# Patterns are intentionally strict to avoid false positives on normal
# numbers or short words.

PII_PATTERNS: Dict[str, str] = {
    # ── United States ────────────────────────────────────────────────
    # SSN: 3-2-4 digits separated by hyphens  (e.g. 123-45-6789)
    "ssn": r"\b\d{3}-\d{2}-\d{4}\b",

    # Credit / debit card: 16 digits, optional spaces or hyphens
    # between each group of four  (e.g. 4111 1111 1111 1111)
    "credit_card": r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",

    # ── India ────────────────────────────────────────────────────────
    # Aadhaar: 12 digits in groups of four, separated by spaces
    # (e.g. 2345 6789 0123)
    "aadhaar": r"\b\d{4}\s\d{4}\s\d{4}\b",

    # PAN: 5 uppercase letters + 4 digits + 1 uppercase letter
    # (e.g. ABCDE1234F)
    "pan": r"\b[A-Z]{5}\d{4}[A-Z]\b",

    # IFSC: 4 uppercase letters + 0 + 6 alphanumeric chars
    # (e.g. SBIN0001234)
    "ifsc": r"\b[A-Z]{4}0[A-Z0-9]{6}\b",

    # ── Universal ────────────────────────────────────────────────────
    # Passport: 1-2 uppercase letters followed by 6-9 digits
    # (e.g. A12345678, AB1234567)
    "passport": r"\b[A-Z]{1,2}\d{6,9}\b",

    # Phone: optional country code (+1, +91, +44 …), then 10 digits
    # with common separators  (e.g. +91 98765 43210, (555) 123-4567)
    "phone": r"\b(\+\d{1,3}[\s-])?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b",

    # Email: standard RFC-ish pattern
    # (e.g. user@example.com)
    "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
}


# ---------------------------------------------------------------------------
# Keyword-context patterns — catch PII mentioned by name in any format
# ---------------------------------------------------------------------------
# Voice input rarely produces formatted strings like "123-45-6789".
# Instead users say "my SSN is 3856789" or "my card number is 4111...".
# These patterns match KEYWORD + VALUE and redact only the value.
#
# Each tuple: (regex, pii_type)
# The regex must have exactly 2 capturing groups:
#   group 1 → the keyword phrase  (kept verbatim in output)
#   group 2 → the sensitive value (replaced with placeholder)

KEYWORD_PATTERNS: List[Tuple[str, str]] = [
    # "my SSN is 382910", "SSN number 123-45-6789", "social security 123456789"
    (
        r"\b(ssn|social[\s\-]security(?:[\s\-]number)?)\s*(?:number\s*)?(?:is\s+|:?\s*)(\d[\d\s\-]{4,20})",
        "ssn",
    ),
    # "card number 4111...", "credit card is 1234 5678..."
    (
        r"\b(credit[\s\-]card|debit[\s\-]card|card[\s\-]number)\s*(?:is\s+|:?\s*)(\d[\d\s\-]{12,25})",
        "credit_card",
    ),
    # "passport number A1234567"
    (
        r"\b(passport(?:[\s\-]number)?)\s*(?:is\s+|:?\s*)([A-Z0-9]{6,12})",
        "passport",
    ),
    # "driving licence DF3856789", "license number ABC1234", "DL number 123"
    (
        r"\b(driving[\s\-]licen[sc]e|licen[sc]e[\s\-]number|dl[\s\-]?(?:number|no\.?))\s*(?:is\s+|:?\s*)([A-Z0-9][\w\-\s]{3,20})",
        "license",
    ),
    # "aadhaar 2345 6789 0123", "aadhar number is 123456789012"
    (
        r"\b(aadhaar(?:[\s\-]number)?|aadhar(?:[\s\-]number)?)\s*(?:is\s+|:?\s*)(\d[\d\s\-]{8,15})",
        "aadhaar",
    ),
    # "phone number 9876543210", "mobile number is 98765..."
    (
        r"\b(phone(?:[\s\-]number)?|mobile(?:[\s\-]number)?|contact[\s\-]number)\s*(?:is\s+|:?\s*)([\+\d][\d\s\-]{8,15})",
        "phone",
    ),
]


# ---------------------------------------------------------------------------
# Redaction placeholders — one per PII type
# ---------------------------------------------------------------------------

REDACTION_MAP: Dict[str, str] = {
    "ssn":         "[SSN_REDACTED]",
    "credit_card": "[CARD_REDACTED]",
    "aadhaar":     "[AADHAAR_REDACTED]",
    "pan":         "[PAN_REDACTED]",
    "ifsc":        "[IFSC_REDACTED]",
    "passport":    "[PASSPORT_REDACTED]",
    "phone":       "[PHONE_REDACTED]",
    "email":       "[EMAIL_REDACTED]",
    "license":     "[LICENSE_REDACTED]",
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def detect_pii(raw_text: str) -> PIIResult:
    """
    Scan *raw_text* for known PII patterns and replace every match with a
    human-readable redaction placeholder.

    This function is **synchronous** and performs no I/O — safe to call
    on the hot path without blocking the event loop.

    Args:
        raw_text: The verbatim transcription (or typed input) from the user.

    Returns:
        A ``PIIResult`` with:
            - ``clean_text``  – the redacted string.
            - ``has_pii``     – whether any pattern matched.
            - ``pii_types``   – list of matched PII type keys
                                (e.g. ``["ssn", "phone"]``).

    Examples:
        >>> detect_pii("My SSN is 123-45-6789")
        PIIResult(clean_text='My SSN is [SSN_REDACTED]', has_pii=True,
                  pii_types=['ssn'])

        >>> detect_pii("Spent $60 at Starbucks")
        PIIResult(clean_text='Spent $60 at Starbucks', has_pii=False,
                  pii_types=[])
    """
    clean_text = raw_text
    found_types: List[str] = []

    # Pass 1 — strict format patterns (e.g. "123-45-6789", "4111 1111 1111 1111")
    for pii_type, pattern in PII_PATTERNS.items():
        if re.search(pattern, clean_text, re.IGNORECASE):
            found_types.append(pii_type)
            clean_text = re.sub(
                pattern,
                REDACTION_MAP[pii_type],
                clean_text,
                flags=re.IGNORECASE,
            )

    # Pass 2 — keyword-context patterns (e.g. "my SSN is 3856789")
    # Redacts only the VALUE (group 2); keeps the keyword (group 1) readable.
    for pattern, pii_type in KEYWORD_PATTERNS:
        if re.search(pattern, clean_text, re.IGNORECASE):
            if pii_type not in found_types:
                found_types.append(pii_type)
            placeholder = REDACTION_MAP[pii_type]
            clean_text = re.sub(
                pattern,
                lambda m, ph=placeholder: m.group(1) + " " + ph,
                clean_text,
                flags=re.IGNORECASE,
            )

    return PIIResult(
        clean_text=clean_text,
        has_pii=len(found_types) > 0,
        pii_types=found_types,
    )
