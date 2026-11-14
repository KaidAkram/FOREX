from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_GET
from apps.macro.models import SystemSetting
from apps.macro.services.scheduler import get_scheduler_telemetry

import json

@require_GET
def snapshot(request):
    version = SystemSetting.objects.filter(key='public_macro_version').first()
    if not version:
        return JsonResponse({'error': 'Initial data refresh is pending.'}, status=503)
    etag = '"' + version.value['version'] + '"'
    inm = (request.headers.get('If-None-Match') or '').strip()
    is_match = bool(inm and (inm == etag or inm == f'W/{etag}' or inm.strip('W/').strip('"') == version.value['version']))
    if is_match:
        response = HttpResponse(status=304)
    else:
        row = SystemSetting.objects.filter(key='public_macro_snapshot').first()
        if not row:
            return JsonResponse({'error': 'Snapshot unavailable.'}, status=503)
        body = json.dumps(row.value, separators=(',', ':'))
        response = HttpResponse(body, content_type='application/json')
    response['ETag'] = etag
    response['Cache-Control'] = 'public, max-age=0, must-revalidate'
    return response

@require_GET
def health(request):
    # Liveness is independent of upstream publishers; monitor worker readiness separately.
    SystemSetting.objects.exists()
    return JsonResponse({'status': 'ok'})

@require_GET
def readiness(request):
    telemetry = get_scheduler_telemetry()
    from datetime import datetime, timedelta
    from django.utils import timezone
    row = SystemSetting.objects.filter(key='public_macro_snapshot').first()
    has_usable_coverage = bool(row and any(len(c) > 0 for c in row.value.get('data', {}).values()))
    has_snapshot = bool(row and has_usable_coverage)
    recent = bool(row and timezone.now() - datetime.fromisoformat(row.value['published_at']) < timedelta(minutes=20))
    healthy = telemetry['scheduler_alive'] and recent and telemetry['last_status'] == 'SUCCESS' and has_usable_coverage
    
    last_cycle = SystemSetting.objects.filter(key='last_cycle_telemetry').first()
    cycle_data = last_cycle.value if last_cycle else None

    return JsonResponse({
        'status': 'ok' if healthy else 'degraded',
        'worker_alive': telemetry['scheduler_alive'],
        'has_snapshot': has_snapshot,
        'has_usable_coverage': has_usable_coverage,
        'last_status': telemetry['last_status'],
        'last_cycle': cycle_data
    }, status=200 if healthy else 503)
