"""Shared calendar horizon helpers for active LIVE month and N+3 forward columns."""
from __future__ import annotations

from datetime import date


def add_months_ym(year: int, month: int, offset: int) -> str:
    """Shift a (year, month) pair by offset calendar months and format as YYYY-MM."""
    total = year * 12 + (month - 1) + offset
    target_year = total // 12
    target_month = (total % 12) + 1
    return f"{target_year:04d}-{target_month:02d}"


def get_forward_months(count: int = 3, today: date | None = None) -> list[str]:
    """Return the next `count` YYYY-MM months following `today` (defaulting to UTC today)."""
    ref = today or date.today()
    return [add_months_ym(ref.year, ref.month, offset) for offset in range(1, count + 1)]


def get_active_horizon_months(forward_count: int = 3, today: date | None = None) -> set[str]:
    """Return active calendar months of the current year plus the next `forward_count` months."""
    ref = today or date.today()
    months = {f"{ref.year:04d}-{m_idx:02d}" for m_idx in range(1, 13)}
    months.update(get_forward_months(forward_count, ref))
    return months
