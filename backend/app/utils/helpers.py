from __future__ import annotations

from datetime import datetime


def format_currency(amount: float, currency: str = "USD") -> str:
    """Format a numeric amount as a currency string."""
    symbols = {"USD": "$", "EUR": "€", "GBP": "£", "INR": "₹"}
    symbol = symbols.get(currency.upper(), currency + " ")
    return f"{symbol}{amount:,.2f}"


def safe_parse_datetime(value: str | None) -> datetime | None:
    """Attempt to parse a datetime string, return None on failure."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None
