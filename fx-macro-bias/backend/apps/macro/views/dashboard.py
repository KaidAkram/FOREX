"""Dashboard API views — KPIs, Latest Data, Data Status."""
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def kpis(request):
    """Return the 7 KPI card values for the dashboard."""
    from apps.macro.models import FXPair, FinalScore, MacroIndicator, MacroDataPoint

    active_pairs = FXPair.objects.filter(is_active=True).count()
    active_indicators = MacroIndicator.objects.filter(is_active=True).count()

    # Latest bias counts (most recent month with complete scores)
    latest_month = (
        FinalScore.objects.filter(is_complete=True)
        .values_list("month", flat=True)
        .order_by("-month")
        .first()
    )

    up_count = down_count = neutral_count = 0
    if latest_month:
        latest_scores = FinalScore.objects.filter(month=latest_month, is_complete=True)
        up_count = latest_scores.filter(bias="UP").count()
        down_count = latest_scores.filter(bias="DOWN").count()
        neutral_count = latest_scores.filter(bias="NEUTRAL").count()

    last_calc = (
        FinalScore.objects.filter(calculated_at__isnull=False)
        .order_by("-calculated_at")
        .values_list("calculated_at", flat=True)
        .first()
    )

    last_data = (
        MacroDataPoint.objects.filter(status="published")
        .order_by("-published_at")
        .values_list("published_at", flat=True)
        .first()
    )

    return Response({
        "active_fx_pairs": active_pairs,
        "up_bias": up_count,
        "down_bias": down_count,
        "neutral_bias": neutral_count,
        "active_indicators": active_indicators,
        "last_calculation": last_calc,
        "last_data_update": last_data,
    })


@api_view(["GET"])
def latest_data(request):
    """Latest 20 published data points across all indicators."""
    from apps.macro.models import MacroDataPoint

    points = (
        MacroDataPoint.objects.filter(status="published", is_active_value=True)
        .select_related("country", "indicator")
        .order_by("-published_at", "-month")[:20]
    )

    data = [
        {
            "indicator": p.indicator.name,
            "country": p.country.name,
            "month": p.month.strftime("%b %Y"),
            "value": p.value,
            "published": p.published_at.strftime("%Y-%m-%d") if p.published_at else "—",
            "source": p.source,
            "status": p.status,
        }
        for p in points
    ]
    return Response(data)


@api_view(["GET"])
def data_status(request):
    """Per-indicator data availability status."""
    from apps.macro.models import MacroIndicator, MacroDataPoint
    from datetime import date

    today = date.today()
    indicators = MacroIndicator.objects.filter(is_active=True).order_by("display_order")
    result = []

    for ind in indicators:
        latest = (
            MacroDataPoint.objects.filter(indicator=ind, is_active_value=True)
            .order_by("-month")
            .first()
        )

        if not latest:
            status = "Missing"
            last_pub = None
        elif latest.status == "manual":
            status = "Manual"
            last_pub = latest.month
        else:
            # Simple staleness check: >45 days since last data
            days_old = (today - latest.month).days
            status = "Updated" if days_old < 45 else "Pending"
            last_pub = latest.month

        result.append({
            "indicator": ind.name,
            "slug": ind.slug,
            "frequency": ind.get_frequency_display(),
            "status": status,
            "last_published": last_pub.strftime("%b %Y") if last_pub else None,
            "next_expected": "—",
        })

    return Response(result)
