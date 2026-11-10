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
    try:
        return Response({"success": True, **refresh_equity()})
    except Exception:
        logger.exception("Live Equity refresh failed")
        return Response({"success": False, "error": "Equity refresh failed; previous calculations retained."}, status=502)


refresh.throttle_scope = "scraper_trigger"
