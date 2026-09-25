"""
System & Scraper Orchestration Settings Views
Handles persistent configuration and pipeline triggers.
"""
from datetime import datetime, timezone
import logging
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from apps.macro.models import SystemSetting, AuditLog
from apps.macro.services.calculator import recalculate_full_matrix

logger = logging.getLogger(__name__)

DEFAULT_SETTINGS = {
    "cronPreset": "4hours",
    "customCron": "0 */4 * * *",
    "timezone": "UTC",
    "cronActive": True,
    "rangePreset": "1y",
    "startDate": "2023-10-01",
    "endDate": "2026-09-22",
    "scraperLang": "bilingual",
    "systemUIRefLang": "en",
    "concurrency": 4,
    "timeoutSec": 30,
    "proxyRotation": True,
    "retryAttempts": 3,
    "notifyOnSuccess": True,
    "notifyOnError": True,
    "webhookUrl": "https://discord.com/api/webhooks/macro-alerts",
    "lastScrapeTime": "Oct 24, 14:00 UTC",
}


@api_view(["GET", "POST", "PUT"])
def settings_config(request):
    """
    GET: Retrieve the active system & scraper settings.
    POST / PUT: Save and immediately apply new settings across the platform.
    """
    setting_obj = SystemSetting.objects.filter(key="scraper_settings").first()

    if request.method == "GET":
        if setting_obj and setting_obj.value:
            merged = {**DEFAULT_SETTINGS, **setting_obj.value}
        else:
            merged = DEFAULT_SETTINGS

        latest_audit = (
            AuditLog.objects.filter(entity_type="SystemSetting", entity_id="scraper_settings")
            .order_by("-created_at")
            .first()
        )
        audit_info = None
        if latest_audit:
            audit_info = {
                "action": latest_audit.action,
                "user": latest_audit.user,
                "timestamp": latest_audit.created_at.isoformat(),
            }

        return Response({
            "success": True,
            "settings": merged,
            "latest_audit": audit_info,
        })

    # POST or PUT -> Save settings
    data = request.data or {}
    old_val = setting_obj.value if setting_obj else DEFAULT_SETTINGS
    merged = {**DEFAULT_SETTINGS, **(setting_obj.value if setting_obj else {}), **data}

    # Validation
    try:
        merged["concurrency"] = max(1, min(8, int(merged.get("concurrency", 4))))
        merged["timeoutSec"] = max(5, min(120, int(merged.get("timeoutSec", 30))))
        merged["retryAttempts"] = max(0, min(10, int(merged.get("retryAttempts", 3))))
    except (ValueError, TypeError):
        return Response({"error": "Invalid numerical parameters for concurrency or timeout."}, status=status.HTTP_400_BAD_REQUEST)

    # Persist in DB
    setting_obj, created = SystemSetting.objects.update_or_create(
        key="scraper_settings",
        defaults={
            "value": merged,
            "description": "Active Scraper & Cron Orchestration configuration"
        }
    )

    # Record Audit Log
    AuditLog.objects.create(
        entity_type="SystemSetting",
        entity_id="scraper_settings",
        action="updated" if not created else "created",
        before_value=old_val,
        after_value=merged,
        user=getattr(request.user, "username", "admin"),
        notes=f"Updated scraper settings: cron={merged.get('cronPreset')}, active={merged.get('cronActive')}, concurrency={merged.get('concurrency')}"
    )

    logger.info("Scraper settings updated and applied successfully.")

    return Response({
        "success": True,
        "message": "Settings saved and applied successfully.",
        "settings": merged,
        "applied_at": datetime.now(timezone.utc).isoformat()
    })


@api_view(["POST"])
def trigger_scraper_pipeline(request):
    """
    Executes the macro calculation and ingestion pipeline on demand.
    Recalculates differentials, ratings, and final scores for all G10 currency pairs.
    """
    try:
        # Execute recalculation of full matrix
        records_updated = recalculate_full_matrix()

        now_utc = datetime.now(timezone.utc)
        now_str = now_utc.strftime("%b %d, %H:%M UTC")

        # Update lastScrapeTime in SystemSetting
        setting_obj = SystemSetting.objects.filter(key="scraper_settings").first()
        current_val = setting_obj.value if setting_obj else {**DEFAULT_SETTINGS}
        current_val["lastScrapeTime"] = now_str
        SystemSetting.objects.update_or_create(
            key="scraper_settings",
            defaults={"value": current_val}
        )

        # Audit Log
        AuditLog.objects.create(
            entity_type="ScraperExecution",
            entity_id="manual_trigger",
            action="executed",
            after_value={"records_updated": records_updated, "timestamp": now_utc.isoformat()},
            user=getattr(request.user, "username", "admin"),
            notes=f"Manual scraper execution: {records_updated} pair-months recalculated and validated."
        )

        return Response({
            "success": True,
            "message": f"Pipeline executed successfully. {records_updated} pair-month calculations updated.",
            "records_updated": records_updated,
            "last_scrape_time": now_str,
        })
    except Exception as e:
        logger.exception("Error executing scraper pipeline")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
