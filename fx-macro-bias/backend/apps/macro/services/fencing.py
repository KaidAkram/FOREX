"""Fence writes from a worker whose database lease expired or changed owner."""
from contextvars import ContextVar
from django.utils import timezone
from apps.macro.models import WorkerLease
worker_owner = ContextVar('worker_owner', default=None)
def check_lease():
    owner = worker_owner.get()
    if owner is None:
        return
    # Caller holds transaction.atomic; row lock prevents ownership changes during publication.
    lease = WorkerLease.objects.select_for_update().get(name='macro')
    if lease.owner != owner or lease.expires_at <= timezone.now():
        raise RuntimeError('Worker lease lost; publication cancelled')
