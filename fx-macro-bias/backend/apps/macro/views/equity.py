import logging
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from apps.common.permissions import IsAdminStaff
from apps.macro.services.equity import refresh_equity

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([IsAdminStaff])
@throttle_classes([ScopedRateThrottle])
def refresh(request):
    from apps.macro.services.scheduler import queue_refresh
    return Response(queue_refresh('admin_equity'), status=202)
