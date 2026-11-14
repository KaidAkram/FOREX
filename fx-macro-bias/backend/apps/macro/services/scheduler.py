"""Dedicated worker with a database lease, durable requests and shared telemetry."""
import logging
import os
import threading
import uuid
from datetime import timedelta, datetime
from django.db import close_old_connections, connections
from django.utils import timezone
from apps.macro.models import WorkerLease, SystemSetting

logger = logging.getLogger(__name__)
_stop_event = threading.Event()
_scheduler_thread = None

LEASE_DURATION_SECONDS = 900

def queue_refresh(trigger_source='manual'):
    now = timezone.now().isoformat()
    SystemSetting.objects.update_or_create(key='refresh_request', defaults={'value': {'requested_at': now, 'source': trigger_source}})
    return {'success': True, 'status': 'QUEUED', 'message': 'Refresh queued. Live data updates automatically when ready.'}

def acquire_lease(owner):
    now = timezone.now()
    try:
        WorkerLease.objects.get_or_create(name='macro', defaults={'owner': '', 'expires_at': now, 'heartbeat_at': now})
        return WorkerLease.objects.filter(name='macro', expires_at__lte=now).update(
            owner=owner, expires_at=now + timedelta(seconds=LEASE_DURATION_SECONDS), heartbeat_at=now) == 1
    except Exception as exc:
        logger.warning(f"Database not ready for worker lease: {exc}")
        return False

def release_lease(owner):
    try:
        WorkerLease.objects.filter(name='macro', owner=owner).update(owner='', expires_at=timezone.now())
    except Exception:
        pass

def _heartbeat(owner, stop):
    try:
        while not stop.wait(20):
            try:
                close_old_connections()
                now = timezone.now()
                updated = WorkerLease.objects.filter(name='macro', owner=owner).update(
                    heartbeat_at=now, expires_at=now + timedelta(seconds=LEASE_DURATION_SECONDS)
                )
                if not updated:
                    lease = WorkerLease.objects.filter(name='macro').first()
                    if lease and lease.owner != owner:
                        logger.error('Worker lease ownership lost to %s', lease.owner)
                        return
            except Exception as exc:
                logger.warning('Worker lease heartbeat attempt failed: %s; retrying next tick', exc)
    finally:
        connections.close_all()

def run_once(force=False):
    from apps.macro.services.scraper_orchestrator import ScraperOrchestrator
    owner = uuid.uuid4().hex
    if not acquire_lease(owner):
        return {'success': False, 'status': 'BUSY'}
    from apps.macro.services.fencing import worker_owner
    token = worker_owner.set(owner)
    heartbeat_stop = threading.Event()
    heartbeat = threading.Thread(target=_heartbeat, args=(owner, heartbeat_stop), daemon=True)
    heartbeat.start()
    try:
        row = SystemSetting.objects.filter(key='scraper_settings').first()
        cfg = row.value if row else {}
        request = SystemSetting.objects.filter(key='refresh_request').first()
        due = cfg.get('next_scheduled_run')
        next_run = datetime.fromisoformat(due) if due else timezone.now()
        if timezone.is_naive(next_run):
            next_run = timezone.make_aware(next_run)
        has_snapshot = SystemSetting.objects.filter(key='public_macro_snapshot').exists()
        if not force and not request and has_snapshot and (not cfg.get('cronActive', True) or next_run > timezone.now()):
            return {'status': 'IDLE'}
        result = ScraperOrchestrator.run_full_pipeline(request.value.get('source', 'worker') if request else 'worker')
        if request:
            SystemSetting.objects.filter(pk=request.pk, updated_at=request.updated_at).delete()
        notify_failure(result)
        return result
    finally:
        heartbeat_stop.set()
        heartbeat.join(timeout=5)
        release_lease(owner)
        worker_owner.reset(token)

def notify_failure(result):
    # Operators configure this secret on the worker; never publish it in a snapshot.
    settings_row = SystemSetting.objects.filter(key='scraper_settings').first()
    cfg = settings_row.value if settings_row else {}
    url = os.environ.get('ALERT_WEBHOOK_URL') or cfg.get('webhookUrl', '')
    if not url or result.get('success') or not cfg.get('notifyOnError', True):
        return
    import json
    import urllib.request
    from apps.common.security import validate_safe_webhook_url
    try:
        url = validate_safe_webhook_url(url)
        body = json.dumps({'content': 'ShiftFX refresh needs attention: ' + '; '.join(result.get('skipped_reasons', []))[:1500]}).encode()
        with urllib.request.urlopen(urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'}), timeout=10):
            pass
    except Exception:
        logger.exception('Could not deliver worker alert')

def _worker_loop():
    # Allow web server 30 seconds to boot, bind $PORT and pass Render health checks
    _stop_event.wait(30)
    while not _stop_event.is_set():
        try:
            close_old_connections()
            SystemSetting.objects.update_or_create(key='worker_heartbeat', defaults={'value': {'at': timezone.now().isoformat()}})
            has_snapshot = SystemSetting.objects.filter(key='public_macro_snapshot').exists()
            run_once(force=not has_snapshot)
        except Exception:
            logger.exception('Worker cycle failed; retrying in 15 seconds')
        _stop_event.wait(15)
    connections.close_all()

def start_background_scheduler():
    global _scheduler_thread
    if _scheduler_thread and _scheduler_thread.is_alive():
        return
    _stop_event.clear()
    _scheduler_thread = threading.Thread(target=_worker_loop, daemon=True)
    _scheduler_thread.start()

def stop_background_scheduler():
    _stop_event.set()

def force_trigger_now(trigger_source='manual'):
    return run_once(force=True)

def get_scheduler_telemetry():
    row = SystemSetting.objects.filter(key='scraper_settings').first()
    cfg = row.value if row else {}
    lease = WorkerLease.objects.filter(name='macro').first()
    heartbeat = SystemSetting.objects.filter(key='worker_heartbeat').first()
    last = datetime.fromisoformat(heartbeat.value['at']) if heartbeat else None
    running = bool(lease and lease.owner and lease.expires_at > timezone.now())
    alive = running or bool(last and timezone.now() - last < timedelta(seconds=90))
    return {'scheduler_alive': alive, 'is_currently_running': running, 'cron_active': cfg.get('cronActive', True),
            'cron_preset': cfg.get('cronPreset', '5minutes'), 'last_scrape_time': cfg.get('lastScrapeTime'),
            'last_status': cfg.get('last_status', 'NEVER_RUN'), 'next_scheduled_run': cfg.get('next_scheduled_run'),
            'next_scheduled_run_display': cfg.get('next_scheduled_run_display'), 'skipped_reason': cfg.get('skipped_reason'),
            'has_skipped_prints': cfg.get('has_skipped_prints', False),
            'queued': SystemSetting.objects.filter(key='refresh_request').exists()}
