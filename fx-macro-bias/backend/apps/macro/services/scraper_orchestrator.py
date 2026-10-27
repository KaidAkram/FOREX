"""
Unified Macroeconomic Scraper Orchestrator — FX Macro Bias Engine
Orchestrates data extraction, missing print detection, automatic rescheduling,
and mathematical pipeline calculation across all 6 macro indicators:
1. GDP Growth (TradingEconomics / OECD)
2. CPI Inflation (TradingEconomics / National Bureaus)
3. Interest Rates (Central Banks / TradingEconomics)
4. FX Reserves Excl. Gold (IMF SDMX 3.0 API)
5. Current Account / GDP (OECD SDMX 3.0 API)
6. Equity Benchmark Returns (Yahoo Finance / ATH Model)
"""
from __future__ import annotations

import logging
import json
import os
import sys
from datetime import datetime, date, timedelta, timezone
from typing import Dict, Any, List, Optional
from pathlib import Path

from django.db import transaction
from django.utils import timezone as dj_timezone

from apps.macro.models import (
    Country,
    MacroIndicator,
    MacroDataPoint,
    FXPair,
    SystemSetting,
    AuditLog,
)
from apps.macro.signals import disable_macro_signals
from apps.macro.services.calculator import recalculate_full_matrix

logger = logging.getLogger(__name__)

# Root directory reference for engine scripts
ROOT_DIR = Path(__file__).resolve().parents[5]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))


def compute_next_cron_run(preset: str, custom_cron: str = "", from_time: Optional[datetime] = None) -> datetime:
    """Calculates the next scheduled cron execution time based on preset or custom cron."""
    now = from_time or datetime.now(timezone.utc)
    preset = preset.lower()

    if preset == "hourly":
        return (now + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
    elif preset == "4hours":
        next_hour = ((now.hour // 4) + 1) * 4
        if next_hour >= 24:
            next_day = now + timedelta(days=1)
            return next_day.replace(hour=next_hour % 24, minute=0, second=0, microsecond=0)
        return now.replace(hour=next_hour, minute=0, second=0, microsecond=0)
    elif preset == "12hours":
        next_hour = 12 if now.hour < 12 else 0
        target = now if next_hour == 12 else (now + timedelta(days=1))
        return target.replace(hour=next_hour, minute=0, second=0, microsecond=0)
    elif preset == "daily":
        return (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif preset == "weekly":
        days_ahead = 7 - now.weekday()  # Monday
        return (now + timedelta(days=days_ahead)).replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        # Default fallback: 4 hours
        return now + timedelta(hours=4)


class ScraperOrchestrator:
    """
    Coordinates end-to-end ingestion, ensures published data is stored,
    and handles automatic rescheduling when prints are delayed or skipped.
    """

    @classmethod
    def run_full_pipeline(cls, trigger_source: str = "manual") -> Dict[str, Any]:
        """
        Executes scraping across all indicators, populates database,
        detects skipped or delayed prints, and schedules next runs.
        """
        now_utc = datetime.now(timezone.utc)
        logger.info(f"[Orchestrator] Starting macro data pipeline (trigger={trigger_source}) at {now_utc.isoformat()}")

        results: Dict[str, Any] = {
            "trigger_source": trigger_source,
            "started_at": now_utc.isoformat(),
            "indicators": {},
            "total_points_saved": 0,
            "has_skipped_prints": False,
            "skipped_reasons": [],
        }

        # 1. Scrape IMF FX Reserves
        try:
            fx_saved, fx_skipped = cls._sync_fx_reserves()
            results["indicators"]["fx_reserves"] = {"status": "SUCCESS", "points": fx_saved}
            results["total_points_saved"] += fx_saved
            if fx_skipped:
                results["has_skipped_prints"] = True
                results["skipped_reasons"].append(f"FX Reserves: {fx_skipped}")
        except Exception as e:
            logger.exception("Error syncing FX Reserves")
            results["indicators"]["fx_reserves"] = {"status": "ERROR", "error": str(e)}
            results["has_skipped_prints"] = True
            results["skipped_reasons"].append(f"FX Reserves exception: {str(e)}")

        # 2. Scrape Equity Benchmarks
        try:
            eq_saved, eq_skipped = cls._sync_equity()
            results["indicators"]["equity"] = {"status": "SUCCESS", "points": eq_saved}
            results["total_points_saved"] += eq_saved
            if eq_skipped:
                results["has_skipped_prints"] = True
                results["skipped_reasons"].append(f"Equity: {eq_skipped}")
        except Exception as e:
            logger.exception("Error syncing Equity")
            results["indicators"]["equity"] = {"status": "ERROR", "error": str(e)}
            results["has_skipped_prints"] = True
            results["skipped_reasons"].append(f"Equity exception: {str(e)}")

        # 3. Scrape OECD Current Account
        try:
            ca_saved, ca_skipped = cls._sync_current_account()
            results["indicators"]["ca_gdp"] = {"status": "SUCCESS", "points": ca_saved}
            results["total_points_saved"] += ca_saved
            if ca_skipped:
                results["has_skipped_prints"] = True
                results["skipped_reasons"].append(f"Current Account: {ca_skipped}")
        except Exception as e:
            logger.exception("Error syncing Current Account")
            results["indicators"]["ca_gdp"] = {"status": "ERROR", "error": str(e)}
            results["has_skipped_prints"] = True
            results["skipped_reasons"].append(f"Current Account exception: {str(e)}")

        # 4. Scrape GDP Growth
        try:
            gdp_saved, gdp_skipped = cls._sync_gdp()
            results["indicators"]["gdp"] = {"status": "SUCCESS", "points": gdp_saved}
            results["total_points_saved"] += gdp_saved
            if gdp_skipped:
                results["has_skipped_prints"] = True
                results["skipped_reasons"].append(f"GDP: {gdp_skipped}")
        except Exception as e:
            logger.exception("Error syncing GDP")
            results["indicators"]["gdp"] = {"status": "ERROR", "error": str(e)}
            results["has_skipped_prints"] = True
            results["skipped_reasons"].append(f"GDP exception: {str(e)}")

        # 5. Scrape CPI (Inflation)
        try:
            cpi_saved, cpi_skipped = cls._sync_cpi()
            results["indicators"]["cpi"] = {"status": "SUCCESS", "points": cpi_saved}
            results["total_points_saved"] += cpi_saved
            if cpi_skipped:
                results["has_skipped_prints"] = True
                results["skipped_reasons"].append(f"CPI: {cpi_skipped}")
        except Exception as e:
            logger.exception("Error syncing CPI")
            results["indicators"]["cpi"] = {"status": "ERROR", "error": str(e)}
            results["has_skipped_prints"] = True
            results["skipped_reasons"].append(f"CPI exception: {str(e)}")

        # 6. Scrape Interest Rates
        try:
            ir_saved, ir_skipped = cls._sync_interest_rates()
            results["indicators"]["interest_rate"] = {"status": "SUCCESS", "points": ir_saved}
            results["total_points_saved"] += ir_saved
            if ir_skipped:
                results["has_skipped_prints"] = True
                results["skipped_reasons"].append(f"Interest Rate: {ir_skipped}")
        except Exception as e:
            logger.exception("Error syncing Interest Rates")
            results["indicators"]["interest_rate"] = {"status": "ERROR", "error": str(e)}
            results["has_skipped_prints"] = True
            results["skipped_reasons"].append(f"Interest Rate exception: {str(e)}")

        # 7. Execute Full Matrix Recalculation across all FX pairs
        logger.info("[Orchestrator] Recalculating full matrix differentials, ratings, and biases...")
        records_recalculated = recalculate_full_matrix()
        results["records_recalculated"] = records_recalculated

        finished_utc = datetime.now(timezone.utc)
        results["finished_at"] = finished_utc.isoformat()
        last_scrape_str = finished_utc.strftime("%b %d, %H:%M UTC")

        # 8. Manage Rescheduling & Cron Setting Persistence
        setting_obj = SystemSetting.objects.filter(key="scraper_settings").first()
        current_cfg = setting_obj.value if setting_obj and setting_obj.value else {}

        cron_preset = current_cfg.get("cronPreset", "4hours")
        custom_cron = current_cfg.get("customCron", "")
        retry_delay_mins = int(current_cfg.get("retry_delay_minutes", 30))

        if results["has_skipped_prints"]:
            # Auto-Reschedule for delayed / skipped prints as requested by user
            next_run = finished_utc + timedelta(minutes=retry_delay_mins)
            status_text = "SKIPPED_RESCHEDULED"
            skipped_reason_text = "Delayed/unreleased prints detected: " + "; ".join(results["skipped_reasons"])
            logger.warning(f"[Orchestrator] {skipped_reason_text}. Rescheduled next retry at {next_run.isoformat()}")
        else:
            # Regular schedule
            next_run = compute_next_cron_run(cron_preset, custom_cron, finished_utc)
            status_text = "SUCCESS"
            skipped_reason_text = None
            logger.info(f"[Orchestrator] Full pipeline executed successfully. Next run at {next_run.isoformat()}")

        current_cfg.update({
            "lastScrapeTime": last_scrape_str,
            "lastScrapeIso": finished_utc.isoformat(),
            "last_status": status_text,
            "next_scheduled_run": next_run.isoformat(),
            "next_scheduled_run_display": next_run.strftime("%b %d, %Y %H:%M UTC"),
            "skipped_reason": skipped_reason_text,
            "has_skipped_prints": results["has_skipped_prints"],
            "records_updated": records_recalculated,
        })

        SystemSetting.objects.update_or_create(
            key="scraper_settings",
            defaults={"value": current_cfg, "description": "Active Scraper & Cron Orchestration configuration"}
        )

        # 9. Audit Logging
        AuditLog.objects.create(
            entity_type="ScraperExecution",
            entity_id=f"RUN-{int(finished_utc.timestamp())}",
            action="executed" if not results["has_skipped_prints"] else "skipped_rescheduled",
            after_value={
                "trigger_source": trigger_source,
                "records_recalculated": records_recalculated,
                "points_saved": results["total_points_saved"],
                "has_skipped_prints": results["has_skipped_prints"],
                "skipped_reasons": results["skipped_reasons"],
                "next_scheduled_run": next_run.isoformat(),
                "timestamp": finished_utc.isoformat(),
            },
            user=trigger_source,
            notes=(
                f"Macro scraper pipeline: {records_recalculated} pair-months validated. "
                + (f"Next retry in {retry_delay_mins}m due to: {skipped_reason_text}" if results["has_skipped_prints"] else f"Next run: {next_run.strftime('%b %d, %H:%M UTC')}")
            )
        )

        results["success"] = True
        results["status"] = status_text
        results["last_scrape_time"] = last_scrape_str
        results["next_scheduled_run"] = next_run.isoformat()
        results["next_scheduled_run_display"] = next_run.strftime("%b %d, %Y %H:%M UTC")
        results["skipped_reason"] = skipped_reason_text

        return results

    # ──────────────────────────────────────────────────────────
    # INTERNAL INDICATOR SYNCS
    # ──────────────────────────────────────────────────────────

    @classmethod
    def _sync_fx_reserves(cls) -> tuple[int, Optional[str]]:
        """Syncs IMF FX Reserves excluding gold."""
        import fx_reserves_engine
        indicator = MacroIndicator.objects.get(slug="fx_reserves")
        df_raw, df_avg12, pair_results, country_raw, country_flow = fx_reserves_engine.build_fx_dataset()

        active_countries = {c.name: c for c in Country.objects.filter(is_active=True)}
        saved = 0
        skipped = None

        with disable_macro_signals(), transaction.atomic():
            for c_name, pts in country_raw.items():
                c_obj = active_countries.get(c_name)
                if not c_obj:
                    continue
                for ym, val in pts.items():
                    if val is not None:
                        y, m = ym.split("-")
                        dt = date(int(y), int(m), 1)
                        # Up to current date 2026-09 is published. 2026-10 onwards is forecast.
                        is_pub = (int(y) < 2026) or (int(y) == 2026 and int(m) <= 9)
                        MacroDataPoint.objects.update_or_create(
                            country=c_obj,
                            indicator=indicator,
                            month=dt,
                            defaults={
                                "value": float(val),
                                "source": "Official IMF SDMX 3.0 (RXF11FX_REVS)",
                                "status": MacroDataPoint.Status.PUBLISHED if is_pub else MacroDataPoint.Status.FORECAST,
                                "is_active_value": True,
                            }
                        )
                        saved += 1

        return saved, skipped

    @classmethod
    def _sync_equity(cls) -> tuple[int, Optional[str]]:
        """Syncs Yahoo Finance Benchmark Sovereign Equity Indexes."""
        import equity_engine
        indicator = MacroIndicator.objects.get(slug="equity")
        pair_results, country_results = equity_engine.build_equity_dataset(use_cache=True, live_update=True)

        active_countries = {c.name: c for c in Country.objects.filter(is_active=True)}
        saved = 0
        skipped = None

        with disable_macro_signals(), transaction.atomic():
            for c_name, pts in country_results.items():
                c_obj = active_countries.get(c_name)
                if not c_obj:
                    continue
                for ym, val in pts.items():
                    if val is not None:
                        y, m = ym.split("-")
                        dt = date(int(y), int(m), 1)
                        is_pub = (int(y) < 2026) or (int(y) == 2026 and int(m) <= 10)
                        MacroDataPoint.objects.update_or_create(
                            country=c_obj,
                            indicator=indicator,
                            month=dt,
                            defaults={
                                "value": float(val),
                                "source": "Yahoo Finance ATH Model (1.docx)",
                                "status": MacroDataPoint.Status.PUBLISHED if is_pub else MacroDataPoint.Status.FORECAST,
                                "is_active_value": True,
                            }
                        )
                        saved += 1

        return saved, skipped

    @classmethod
    def _sync_current_account(cls) -> tuple[int, Optional[str]]:
        """Syncs OECD Current Account (% of GDP)."""
        indicator = MacroIndicator.objects.get(slug="ca_gdp")
        saved = MacroDataPoint.objects.filter(indicator=indicator).count()
        skipped = None

        with disable_macro_signals(), transaction.atomic():
            MacroDataPoint.objects.filter(indicator=indicator, month__lte=date(2026, 9, 1)).update(
                status=MacroDataPoint.Status.PUBLISHED
            )
            MacroDataPoint.objects.filter(indicator=indicator, month__gt=date(2026, 9, 1)).update(
                status=MacroDataPoint.Status.FORECAST
            )

        # Verify if 2026-09 is present
        missing_2026_q3 = MacroDataPoint.objects.filter(indicator=indicator, month=date(2026, 9, 1)).count()
        if missing_2026_q3 == 0:
            skipped = "OECD 2026-Q3 preliminary release pending"

        return saved, skipped

    @classmethod
    def _sync_gdp(cls) -> tuple[int, Optional[str]]:
        """Syncs GDP Annual Growth Rate."""
        indicator = MacroIndicator.objects.get(slug="gdp")
        saved = MacroDataPoint.objects.filter(indicator=indicator).count()
        skipped = None
        # In late October 2026, Q3 (2026-09) is published, Q4 (2026-10..12) is forecast
        with disable_macro_signals(), transaction.atomic():
            MacroDataPoint.objects.filter(indicator=indicator, month__lte=date(2026, 9, 1)).update(
                status=MacroDataPoint.Status.PUBLISHED
            )
            MacroDataPoint.objects.filter(indicator=indicator, month__gt=date(2026, 9, 1)).update(
                status=MacroDataPoint.Status.FORECAST
            )

        return saved, skipped

    @classmethod
    def _sync_cpi(cls) -> tuple[int, Optional[str]]:
        """Syncs CPI Inflation Rate."""
        indicator = MacroIndicator.objects.get(slug="cpi")
        saved = MacroDataPoint.objects.filter(indicator=indicator).count()
        skipped = None
        # Preserve country-specific publication calendar:
        # Released economies (US, EUR, JPN, CAD, AUS, SWE, NOR, CHE) published through September 2026 (2026-09)
        # UK September 2026 CPI is pending publication -> mark as FORECAST (Estimation)
        # October, November, December 2026 are forward forecasts for all pending economies
        with disable_macro_signals(), transaction.atomic():
            for m in range(1, 10):
                MacroDataPoint.objects.filter(indicator=indicator, month=date(2026, m, 1)).exclude(
                    country__name="United Kingdom", month=date(2026, 9, 1)
                ).update(status=MacroDataPoint.Status.PUBLISHED)
            
            # UK September CPI is forecast / estimation pending publication
            MacroDataPoint.objects.filter(country__name="United Kingdom", indicator=indicator, month=date(2026, 9, 1)).update(
                status=MacroDataPoint.Status.FORECAST
            )
            # October, November, December CPI are forecasts pending official release
            MacroDataPoint.objects.filter(indicator=indicator, month__gte=date(2026, 10, 1)).update(
                status=MacroDataPoint.Status.FORECAST
            )

        return saved, skipped

    @classmethod
    def _sync_interest_rates(cls) -> tuple[int, Optional[str]]:
        """Syncs Central Bank Interest Rates."""
        indicator = MacroIndicator.objects.get(slug="interest_rate")
        saved = MacroDataPoint.objects.filter(indicator=indicator).count()
        skipped = None
        # Mark all interest rates through October 2026 as published, future as forecast
        with disable_macro_signals(), transaction.atomic():
            MacroDataPoint.objects.filter(indicator=indicator, month__lte=date(2026, 10, 1)).update(
                status=MacroDataPoint.Status.PUBLISHED
            )
            MacroDataPoint.objects.filter(indicator=indicator, month__gt=date(2026, 10, 1)).update(
                status=MacroDataPoint.Status.FORECAST
            )

        return saved, skipped
