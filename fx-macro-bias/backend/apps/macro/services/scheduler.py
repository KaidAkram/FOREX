"""
Background Scraper Cron Scheduler Engine — FX Macro Bias
Runs an automated daemon worker that periodically executes the macroeconomic pipeline,
monitors scheduled windows, and self-heals by rescheduling when prints are delayed or skipped.
"""
from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

from django.utils import timezone as dj_timezone

logger = logging.getLogger(__name__)

_scheduler_thread: Optional[threading.Thread] = None
_stop_event = threading.Event()
_execution_lock = threading.Lock()
_is_currently_running = False
_last_run_result: Dict[str, Any] = {}


def _worker_loop():
    """Continuous background loop monitoring cron schedule and delayed-print retries."""
    global _is_currently_running, _last_run_result
    logger.info("[Scheduler] Scraper background daemon started.")

    # Small initial delay to allow Django to fully boot
    time.sleep(5)

    while not _stop_event.is_set():
        try:
            from apps.macro.models import SystemSetting
            from apps.macro.services.scraper_orchestrator import ScraperOrchestrator, compute_next_cron_run

            setting_obj = SystemSetting.objects.filter(key="scraper_settings").first()
            cfg = setting_obj.value if setting_obj and setting_obj.value else {}

            cron_active = bool(cfg.get("cronActive", True))
            now_utc = datetime.now(timezone.utc)

            # Determine next run
            next_run_str = cfg.get("next_scheduled_run")
            next_run: Optional[datetime] = None

            if next_run_str:
                try:
                    next_run = datetime.fromisoformat(next_run_str)
                    if next_run.tzinfo is None:
                        next_run = next_run.replace(tzinfo=timezone.utc)
                except Exception:
                    next_run = None

            if next_run is None:
                # Initialize next scheduled run
                preset = cfg.get("cronPreset", "4hours")
                next_run = compute_next_cron_run(preset, from_time=now_utc)
                cfg["next_scheduled_run"] = next_run.isoformat()
                cfg["next_scheduled_run_display"] = next_run.strftime("%b %d, %Y %H:%M UTC")
                SystemSetting.objects.update_or_create(
                    key="scraper_settings",
                    defaults={"value": cfg}
                )
                logger.info(f"[Scheduler] Initialized next scheduled run: {next_run.isoformat()}")

            # Check if execution is due
            if cron_active and now_utc >= next_run:
                if _execution_lock.acquire(blocking=False):
                    try:
                        _is_currently_running = True
                        is_retry = bool(cfg.get("has_skipped_prints", False))
                        trigger = "cron_retry" if is_retry else "cron_scheduler"
                        logger.info(f"[Scheduler] Triggering scheduled pipeline run ({trigger})...")

                        res = ScraperOrchestrator.run_full_pipeline(trigger_source=trigger)
                        _last_run_result = res
                    except Exception as err:
                        logger.exception(f"[Scheduler] Pipeline execution error: {err}")
                    finally:
                        _is_currently_running = False
                        _execution_lock.release()

        except Exception as loop_err:
            logger.error(f"[Scheduler] Worker loop error: {loop_err}")

        # Sleep in short increments to remain responsive to stop signals
        for _ in range(15):
            if _stop_event.is_set():
                break
            time.sleep(1)

    logger.info("[Scheduler] Scraper background daemon stopped.")


def start_background_scheduler():
    """Starts the background worker thread if not already running."""
    global _scheduler_thread, _stop_event

    if _scheduler_thread is not None and _scheduler_thread.is_alive():
        logger.debug("[Scheduler] Thread is already active.")
        return

    _stop_event.clear()
    _scheduler_thread = threading.Thread(
        target=_worker_loop,
        name="ScraperSchedulerWorker",
        daemon=True
    )
    _scheduler_thread.start()
    logger.info("[Scheduler] Background scheduler thread spawned successfully.")


def stop_background_scheduler():
    """Stops the background worker thread gracefully."""
    global _stop_event
    _stop_event.set()


def get_scheduler_telemetry() -> Dict[str, Any]:
    """Returns active telemetry regarding scheduler health and next scheduled runs."""
    from apps.macro.models import SystemSetting

    setting_obj = SystemSetting.objects.filter(key="scraper_settings").first()
    cfg = setting_obj.value if setting_obj and setting_obj.value else {}

    is_alive = _scheduler_thread is not None and _scheduler_thread.is_alive()

    return {
        "scheduler_alive": is_alive,
        "is_currently_running": _is_currently_running,
        "cron_active": bool(cfg.get("cronActive", True)),
        "cron_preset": cfg.get("cronPreset", "4hours"),
        "last_scrape_time": cfg.get("lastScrapeTime", "Oct 24, 20:55 UTC"),
        "last_status": cfg.get("last_status", "SUCCESS"),
        "next_scheduled_run": cfg.get("next_scheduled_run"),
        "next_scheduled_run_display": cfg.get("next_scheduled_run_display"),
        "skipped_reason": cfg.get("skipped_reason"),
        "has_skipped_prints": cfg.get("has_skipped_prints", False),
        "last_run_result": _last_run_result,
    }


def force_trigger_now(trigger_source: str = "manual_override") -> Dict[str, Any]:
    """Manually forces an immediate pipeline run using ScraperOrchestrator."""
    global _is_currently_running, _last_run_result
    from apps.macro.services.scraper_orchestrator import ScraperOrchestrator

    with _execution_lock:
        _is_currently_running = True
        try:
            res = ScraperOrchestrator.run_full_pipeline(trigger_source=trigger_source)
            _last_run_result = res
            return res
        finally:
            _is_currently_running = False
