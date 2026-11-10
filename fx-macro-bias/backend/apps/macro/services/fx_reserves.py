"""Shared, non-destructive live ingestion for the IMF FX reserve indicator."""
import logging
import sys
from datetime import date
from pathlib import Path

from django.db import transaction
from django.utils import timezone

from apps.macro.models import Country, MacroDataPoint, MacroIndicator, SystemSetting
from apps.macro.signals import disable_macro_signals

ROOT_DIR = Path(__file__).resolve().parents[5]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
from imf_fx_reserves import fetch_observations  # noqa: E402

logger = logging.getLogger(__name__)
REFRESH_KEY = "fx_reserves_refresh"


def refresh_fx_reserves(*, start_year=2022, recalculate=True):
    previous = SystemSetting.objects.filter(key=REFRESH_KEY).first()
    metadata = dict(previous.value) if previous and isinstance(previous.value, dict) else {}
    attempted_at = timezone.now().isoformat()
    try:
        # Validate the response before modifying the last successful dataset.
        observations, source = fetch_observations(start_year)
        indicator = MacroIndicator.objects.get(slug="fx_reserves")
        countries = {c.name: c for c in Country.objects.filter(is_active=True)}
        supported = set(source["latest_by_country"]) & set(countries)
        if not supported:
            raise ValueError("No active countries matched the IMF response")
        saved = 0
        with transaction.atomic(), disable_macro_signals():
            for name in supported:
                for month, value in observations[name].items():
                    year, number = map(int, month.split("-"))
                    MacroDataPoint.objects.update_or_create(
                        country=countries[name],
                        indicator=indicator,
                        month=date(year, number, 1),
                        is_active_value=True,
                        defaults={
                            "value": value,
                            "source": source["source"],
                            "status": MacroDataPoint.Status.PUBLISHED,
                        },
                    )
                    saved += 1
            # No fixed-date deletion and no invented publication timestamp.
            count = 0
            if recalculate:
                from apps.macro.services.calculator import recalculate_full_matrix
                count = recalculate_full_matrix()
            expected = {name for name, c in countries.items() if c.imf_country_code}
            metadata = {
                **metadata,
                **source,
                "status": "SUCCESS",
                "last_attempt_at": attempted_at,
                "last_success_at": source["fetched_at"],
                "points_saved": saved,
                "records_recalculated": count,
                "missing_countries": sorted(expected - supported),
                "error": None,
            }
            SystemSetting.objects.update_or_create(key=REFRESH_KEY, defaults={"value": metadata})
        return metadata
    except Exception:
        failed = {
            **metadata,
            "last_attempt_at": attempted_at,
            "status": "ERROR",
            "error": "Official refresh failed; last successful observations retained.",
        }
        try:
            SystemSetting.objects.update_or_create(key=REFRESH_KEY, defaults={"value": failed})
        except Exception:
            logger.exception("Could not record failed IMF refresh")
        raise
