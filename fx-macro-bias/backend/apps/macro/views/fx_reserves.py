import logging
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from apps.common.permissions import IsAdminStaff
from apps.macro.services.fx_reserves import refresh_fx_reserves

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([IsAdminStaff])
@throttle_classes([ScopedRateThrottle])
def refresh(request):
    try:
        return Response({"success": True, **refresh_fx_reserves()})
    except Exception:
        logger.exception("IMF FX reserve refresh failed")
        return Response({"success": False, "error": "IMF refresh failed; previous observations retained."}, status=502)


refresh.throttle_scope = "scraper_trigger"
