from apps.macro.services.fencing import check_lease
"""Scheduled ingestion and atomic publication of client snapshots."""
import logging
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from typing import Optional
from django.db import transaction
from django.utils import timezone as django_timezone
from apps.macro.models import SystemSetting, AuditLog, WorkerLease
from apps.macro.services.ingestion import sync_indicator, fetch_te

logger = logging.getLogger(__name__)

def _cron_field(field, low, high):
    values = set()
    for part in field.split(','):
        spec, sep, step = part.partition('/')
        step = int(step) if sep else 1
        if step < 1:
            raise ValueError('Cron step must be positive')
        if spec == '*':
            start, end = low, high
        elif '-' in spec:
            start, end = map(int, spec.split('-'))
        else:
            start = int(spec)
            end = high if sep else start
        if not low <= start <= end <= high:
            raise ValueError('Cron field outside allowed range')
        values.update(range(start, end + 1, step))
    return values

def compute_next_cron_run(preset, custom_cron='', from_time=None, timezone_name='UTC'):
    now = from_time or datetime.now(timezone.utc)
    expressions = {'5minutes': '*/5 * * * *', 'hourly': '0 * * * *', '4hours': '0 */4 * * *',
                   '12hours': '0 */12 * * *', 'daily': '0 0 * * *', 'weekly': '0 0 * * 1'}
    expression = custom_cron if preset == 'custom' else expressions.get(preset)
    if not expression or len(expression.split()) != 5:
        raise ValueError('Select a supported schedule or a valid five-field cron expression')
    fields = expression.split()
    minute, hour, dom, month, dow = [_cron_field(v, *bounds) for v, bounds in zip(fields, [(0,59),(0,23),(1,31),(1,12),(0,7)])]
    dow = {x % 7 for x in dow}
    zone = ZoneInfo(timezone_name)
    candidate = now.astimezone(timezone.utc).replace(second=0, microsecond=0) + timedelta(minutes=1)
    for _ in range(60 * 24 * 366 * 5):
        local = candidate.astimezone(zone)
        day_match = local.day in dom
        week_match = (local.weekday() + 1) % 7 in dow
        day_ok = (day_match or week_match) if fields[2] != '*' and fields[4] != '*' else (day_match and week_match)
        if local.minute in minute and local.hour in hour and local.month in month and day_ok:
            return candidate
        candidate += timedelta(minutes=1)
    raise ValueError('Cron expression has no occurrence within five years')

class ScraperOrchestrator:
    _fetch_te_series = classmethod(lambda cls, slug, category: fetch_te(slug, category)[0])

    @classmethod
    def run_full_pipeline(cls, trigger_source='worker'):
        from apps.macro.services.calculator import recalculate_full_matrix
        from apps.macro.services.snapshot import publish_snapshot
        from apps.macro.services.fx_reserves import refresh_fx_reserves
        from apps.macro.services.equity import refresh_equity
        from apps.macro.services.fencing import worker_owner
        cycle_id = uuid.uuid4().hex[:12]
        started_at = django_timezone.now()
        owner = worker_owner.get()
        results = {'cycle_id': cycle_id, 'started_at': started_at.isoformat(), 'indicators': {}, 'total_points_saved': 0}
        # Publish fast macro releases before the heavier full-history market calculation.
        jobs = [(s, lambda slug=s: sync_indicator(slug)) for s in ('gdp', 'cpi', 'interest_rate', 'ca_gdp')]
        jobs += [('fx_reserves', lambda: refresh_fx_reserves(recalculate=False)), ('equity', lambda: refresh_equity(recalculate=False))]
        errors = []
        for slug, job in jobs:
            if owner:
                now_tick = django_timezone.now()
                WorkerLease.objects.filter(name='macro', owner=owner).update(
                    heartbeat_at=now_tick, expires_at=now_tick + timedelta(seconds=900)
                )
            try:
                result = job()
                missing = result.get('missing_countries', []) + result.get('missing_pairs', [])
                failures = result.get('errors', []) + [f'Missing: {x}' for x in missing]
                if failures:
                    result['status'] = 'PARTIAL'
                    errors.extend(f'{slug}: {x}' for x in failures)
                results['indicators'][slug] = result
                results['total_points_saved'] += result.get('points', result.get('points_saved', 0))
                # Clients read an immutable snapshot: never a half-recalculated matrix.
                with transaction.atomic():
                    check_lease()
                    results['records_recalculated'] = recalculate_full_matrix()
                    publish_snapshot()
            except Exception as exc:
                logger.exception('Indicator refresh failed: %s', slug)
                results['indicators'][slug] = {'status': 'ERROR', 'error': str(exc)}
                errors.append(f'{slug}: {exc}')
        if owner:
            now_tick = django_timezone.now()
            WorkerLease.objects.filter(name='macro', owner=owner).update(
                heartbeat_at=now_tick, expires_at=now_tick + timedelta(seconds=900)
            )
        with transaction.atomic():
            check_lease()
            recalculate_full_matrix()
            publish_snapshot()
        now = django_timezone.now()
        results.update(finished_at=now.isoformat(), success=not errors, status='PARTIAL' if errors else 'SUCCESS',
                       has_skipped_prints=bool(errors), skipped_reasons=errors)
        with transaction.atomic():

            check_lease()
            row, _ = SystemSetting.objects.get_or_create(key='scraper_settings', defaults={'value': {}})
            row = SystemSetting.objects.select_for_update().get(pk=row.pk)
            cfg = dict(row.value)
            next_run = compute_next_cron_run(cfg.get('cronPreset', '5minutes'), cfg.get('customCron', ''), now, cfg.get('timezone', 'UTC'))
            if errors:
                next_run = min(next_run, now + timedelta(minutes=int(cfg.get('retryDelayMinutes', 5))))
            cfg.update(lastScrapeTime=now.strftime('%b %d, %H:%M UTC'), lastScrapeIso=now.isoformat(),
                       last_status=results['status'], next_scheduled_run=next_run.isoformat(),
                       next_scheduled_run_display=next_run.strftime('%b %d, %Y %H:%M UTC'),
                       has_skipped_prints=bool(errors), skipped_reason='; '.join(errors) or None,
                       records_updated=results.get('records_recalculated', 0))
            row.value = cfg
            row.save(update_fields=['value', 'updated_at'])
        SystemSetting.objects.update_or_create(key='pipeline_result', defaults={'value': results})
        AuditLog.objects.create(entity_type='ScraperExecution', entity_id=now.isoformat(), action=results['status'],
                                after_value=results, user=trigger_source)
        cycle_summary = {
            'cycle_id': cycle_id,
            'started_at': started_at.isoformat(),
            'finished_at': now.isoformat(),
            'duration_seconds': round((now - started_at).total_seconds(), 2),
            'status': results['status'],
            'trigger_source': trigger_source,
            'records_recalculated': results.get('records_recalculated', 0),
            'total_points_saved': results.get('total_points_saved', 0),
            'has_skipped_prints': bool(errors),
            'skipped_reasons': errors,
        }
        SystemSetting.objects.update_or_create(key='last_cycle_telemetry', defaults={'value': cycle_summary})
        results['next_scheduled_run'] = next_run.isoformat()
        return results
