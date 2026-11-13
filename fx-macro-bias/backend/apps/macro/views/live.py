from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_GET
from apps.macro.models import SystemSetting
from apps.macro.services.scheduler import get_scheduler_telemetry

from functools import lru_cache
import json

@lru_cache(maxsize=2)
def snapshot_body(version):
    row = SystemSetting.objects.get(key='public_macro_snapshot')
    return json.dumps(row.value, separators=(',', ':'))

@require_GET
def snapshot(request):
    version = SystemSetting.objects.filter(key='public_macro_version').first()
    if not version:
        return JsonResponse({'error': 'Initial data refresh is pending.'}, status=503)
    etag = '"' + version.value['version'] + '"'
    response = HttpResponse(status=304) if request.headers.get('If-None-Match') == etag else HttpResponse(snapshot_body(version.value['version']), content_type='application/json')
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
    has_snapshot = row is not None
    recent = bool(row and timezone.now() - datetime.fromisoformat(row.value['published_at']) < timedelta(minutes=20))
    healthy = telemetry['scheduler_alive'] and recent and telemetry['last_status'] == 'SUCCESS'
    return JsonResponse({'status': 'ok' if healthy else 'degraded', 'worker_alive': telemetry['scheduler_alive'],
                         'has_snapshot': has_snapshot, 'last_status': telemetry['last_status']}, status=200 if healthy else 503)
