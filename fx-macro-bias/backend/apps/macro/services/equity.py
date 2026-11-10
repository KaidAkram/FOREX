"""Shared, transactional pair-level live ingestion for the Equity indicator."""
import logging
import sys
from datetime import date
from pathlib import Path

from django.db import transaction
from django.utils import timezone

from apps.macro.models import (
    Differential,
    FXPair,
    FinalScore,
    MacroDataPoint,
    MacroIndicator,
    Rating,
    SystemSetting,
)
from apps.macro.signals import disable_macro_signals

ROOT_DIR = Path(__file__).resolve().parents[5]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
import equity_engine  # noqa: E402

logger = logging.getLogger(__name__)
REFRESH_KEY = "equity_refresh"


def refresh_equity(*, start_year=2023, recalculate=True):
    previous = SystemSetting.objects.filter(key=REFRESH_KEY).first()
    metadata = dict(previous.value) if previous and isinstance(previous.value, dict) else {}
    attempted_at = timezone.now().isoformat()

    try:
        pair_results, _ = equity_engine.build_equity_dataset(
            use_cache=False,
            live_update=True,
            start_year=start_year,
        )
        indicator = MacroIndicator.objects.get(slug="equity")
        active_pairs = list(
            FXPair.objects.filter(is_active=True).select_related("base_currency", "quote_currency")
        )
        if not active_pairs:
            raise ValueError("No active FX pairs configured")

        saved = 0
        latest_month = None
        missing_pairs = []

        with transaction.atomic(), disable_macro_signals():
            # Per Equity Indicator2.pdf: Equity is computed directly per FX pair,
            # so remove legacy country-level MacroDataPoints and copied future months.
            MacroDataPoint.objects.filter(indicator=indicator).delete()

            valid_months_by_pair = {}
            for pair in active_pairs:
                pair_sym = pair.symbol
                pair_space = pair_sym.replace("/", " ")
                p_data = pair_results.get(pair_sym) or pair_results.get(pair_space) or {}
                if not p_data:
                    missing_pairs.append(pair_sym)
                    continue

                month_dates = []
                for ym, pt in p_data.items():
                    y, m = map(int, ym.split("-"))
                    dt = date(y, m, 1)
                    month_dates.append(dt)
                    if latest_month is None or ym > latest_month:
                        latest_month = ym
                    diff, _ = Differential.objects.update_or_create(
                        pair=pair,
                        indicator=indicator,
                        month=dt,
                        defaults={
                            # Étape 1 (base_value) and Étape 2 (quote_value);
                            # Étape 3 = quote_value - base_value (Synthetic - Index).
                            "base_value": float(pt["change_index"]),
                            "quote_value": float(pt["change_synth"]),
                            "difference": float(pt["final_change"]),
                            "is_complete": True,
                        },
                    )
                    Rating.objects.update_or_create(
                        differential=diff,
                        defaults={"rating_value": int(pt["rating"])},
                    )
                    saved += 1
                valid_months_by_pair[pair.pk] = month_dates

                # Remove any stale/future Equity rows not produced by live candles (e.g. copied 2026-12)
                if month_dates:
                    Differential.objects.filter(pair=pair, indicator=indicator).exclude(
                        month__in=month_dates
                    ).delete()

            if saved == 0:
                raise ValueError("No Equity pair calculations matched active FX pairs")

            # Clean up any orphaned FinalScore months where no MacroDataPoint or Equity Differential exists
            valid_dp_months = set(
                MacroDataPoint.objects.filter(is_active_value=True).values_list("month", flat=True)
            )
            valid_eq_months = set(
                Differential.objects.filter(indicator=indicator, is_complete=True).values_list("month", flat=True)
            )
            valid_all_months = valid_dp_months | valid_eq_months
            if valid_all_months:
                FinalScore.objects.exclude(month__in=valid_all_months).delete()

            count = 0
            if recalculate:
                from apps.macro.services.calculator import recalculate_full_matrix
                count = recalculate_full_matrix()

            fetched_at = timezone.now().isoformat()
            metadata = {
                **metadata,
                "source": "Yahoo Finance Daily OHLC (Equity Indicator2.pdf)",
                "status": "SUCCESS",
                "fetched_at": fetched_at,
                "last_attempt_at": attempted_at,
                "last_success_at": fetched_at,
                "latest_month": latest_month,
                "points_saved": saved,
                "records_recalculated": count,
                "missing_pairs": sorted(missing_pairs),
                "error": None,
            }
            SystemSetting.objects.update_or_create(key=REFRESH_KEY, defaults={"value": metadata})

        return metadata
    except Exception:
        failed = {
            **metadata,
            "last_attempt_at": attempted_at,
            "status": "ERROR",
            "error": "Live Equity refresh failed; previous pair calculations retained.",
        }
        try:
            SystemSetting.objects.update_or_create(key=REFRESH_KEY, defaults={"value": failed})
        except Exception:
            logger.exception("Could not record failed Equity refresh")
        raise
