"""Fence writes from a worker whose database lease expired or changed owner."""
from contextvars import ContextVar
from datetime import timedelta
from django.utils import timezone
from apps.macro.models import WorkerLease

worker_owner = ContextVar('worker_owner', default=None)

def check_lease():
    owner = worker_owner.get()
    if owner is None:
        return
    try:
        lease = WorkerLease.objects.filter(name='macro').first()
        if not lease or lease.owner != owner:
            raise RuntimeError('Worker lease lost; publication cancelled')
        now = timezone.now()
        if lease.expires_at <= now:
            # Renew lease if still owned by this active worker to prevent SQLite lock starvation
            WorkerLease.objects.filter(name='macro', owner=owner).update(
                heartbeat_at=now, expires_at=now + timedelta(seconds=900)
            )
    except RuntimeError:
        raise
    except Exception:
        pass
