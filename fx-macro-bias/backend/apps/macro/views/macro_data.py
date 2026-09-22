"""Macro Data views — Matrix, Differential, Rating, Manual Entry."""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


@api_view(["GET"])
def macro_matrix(request):
    """
    Country × Month matrix for a given indicator.
    ?indicator=gdp  (default: gdp)
    """
    from apps.macro.models import MacroDataPoint, MacroIndicator, Country

    indicator_slug = request.query_params.get("indicator", "gdp")
    try:
        indicator = MacroIndicator.objects.get(slug=indicator_slug)
    except MacroIndicator.DoesNotExist:
        return Response({"error": "Indicator not found."}, status=404)

    countries = Country.objects.filter(is_active=True).order_by("name")
    points = (
        MacroDataPoint.objects.filter(indicator=indicator, is_active_value=True)
        .select_related("country")
        .order_by("country__name", "month")
    )

    # Build {country_iso: {month_str: {value, status}}}
    matrix: dict = {}
    months_set: set = set()
    for p in points:
        iso = p.country.iso_code
        month_str = p.month.strftime("%Y-%m")
        months_set.add(month_str)
        if iso not in matrix:
            matrix[iso] = {}
        matrix[iso][month_str] = {
            "value": p.value,
            "status": p.status,
            "source": p.source,
        }

    months = sorted(months_set)
    rows = [
        {
            "country": c.name,
            "iso": c.iso_code,
            "cells": {m: matrix.get(c.iso_code, {}).get(m) for m in months},
        }
        for c in countries
    ]

    return Response({
        "indicator": indicator.name,
        "slug": indicator.slug,
        "months": months,
        "rows": rows,
    })


@api_view(["POST"])
def manual_entry(request):
    """
    Admin manually enters a value for (country, indicator, month).
    A published value arriving later will silently supersede this.
    """
    from apps.macro.models import MacroDataPoint, Country, MacroIndicator
    from django.utils import timezone

    data = request.data
    try:
        country = Country.objects.get(iso_code=data["country_iso"])
        indicator = MacroIndicator.objects.get(slug=data["indicator_slug"])
        from datetime import date
        month = date.fromisoformat(data["month"])
        value = float(data["value"])
    except (KeyError, ValueError) as e:
        return Response({"error": str(e)}, status=400)
    except (Country.DoesNotExist, MacroIndicator.DoesNotExist):
        return Response({"error": "Country or indicator not found."}, status=404)

    # Check if published value already exists — don't override it
    existing_published = MacroDataPoint.objects.filter(
        country=country,
        indicator=indicator,
        month=month,
        status="published",
        is_active_value=True,
    ).first()

    if existing_published:
        return Response(
            {"error": "A published value already exists for this entry. Manual override not allowed."},
            status=409,
        )

    # Deactivate any existing manual entry
    MacroDataPoint.objects.filter(
        country=country, indicator=indicator, month=month, is_active_value=True
    ).update(is_active_value=False)

    dp = MacroDataPoint.objects.create(
        country=country,
        indicator=indicator,
        month=month,
        value=value,
        status="manual",
        source=f"Manual entry by {getattr(request.user, 'username', 'admin')}",
        is_active_value=True,
        notes=data.get("notes", ""),
    )

    return Response({
        "id": dp.pk,
        "country": country.name,
        "indicator": indicator.name,
        "month": dp.month.strftime("%Y-%m"),
        "value": dp.value,
        "status": dp.status,
    }, status=201)


@api_view(["GET"])
def differential_table(request):
    """
    Differential table for a (pair, indicator).
    ?pair=EUR/USD&indicator=gdp
    """
    from apps.macro.models import Differential, FXPair, MacroIndicator

    pair_symbol = request.query_params.get("pair", "EUR/USD")
    indicator_slug = request.query_params.get("indicator", "gdp")

    try:
        pair = FXPair.objects.get(symbol=pair_symbol)
        indicator = MacroIndicator.objects.get(slug=indicator_slug)
    except (FXPair.DoesNotExist, MacroIndicator.DoesNotExist):
        return Response({"error": "Pair or indicator not found."}, status=404)

    diffs = Differential.objects.filter(
        pair=pair, indicator=indicator
    ).order_by("month")

    rows = [
        {
            "month": d.month.strftime("%Y-%m"),
            "base": d.base_value,
            "quote": d.quote_value,
            "difference": d.difference,
            "is_complete": d.is_complete,
        }
        for d in diffs
    ]
    return Response({
        "pair": pair_symbol,
        "indicator": indicator.name,
        "base_currency": pair.base_currency.name,
        "quote_currency": pair.quote_currency.name,
        "rows": rows,
    })


@api_view(["GET"])
def rating_table(request):
    """
    Rating table for a (pair, indicator).
    ?pair=EUR/USD&indicator=gdp
    """
    from apps.macro.models import Differential, FXPair, MacroIndicator

    pair_symbol = request.query_params.get("pair", "EUR/USD")
    indicator_slug = request.query_params.get("indicator", "gdp")

    try:
        pair = FXPair.objects.get(symbol=pair_symbol)
        indicator = MacroIndicator.objects.get(slug=indicator_slug)
    except (FXPair.DoesNotExist, MacroIndicator.DoesNotExist):
        return Response({"error": "Pair or indicator not found."}, status=404)

    diffs = (
        Differential.objects.filter(pair=pair, indicator=indicator)
        .select_related("rating", "rating__applied_rule")
        .order_by("month")
    )

    rows = []
    for d in diffs:
        try:
            r = d.rating
            rule_str = (
                f"[{r.applied_rule.min_diff}, {r.applied_rule.max_diff}) → {r.applied_rule.rating}"
                if r.applied_rule
                else "—"
            )
            rows.append({
                "month": d.month.strftime("%Y-%m"),
                "difference": d.difference,
                "rating": r.rating_value,
                "applied_rule": rule_str,
                "rule_version": str(r.rule_version) if r.rule_version else "—",
            })
        except Exception:
            rows.append({
                "month": d.month.strftime("%Y-%m"),
                "difference": d.difference,
                "rating": None,
                "applied_rule": "—",
                "rule_version": "—",
            })

    return Response({
        "pair": pair_symbol,
        "indicator": indicator.name,
        "rows": rows,
    })


@api_view(["POST"])
def trigger_recalculation(request):
    """
    Trigger recalculation for a specific (pair, month) or full matrix.
    Body: {"pair": "EUR/USD", "month": "2026-01"} or {"full": true}
    """
    from apps.macro.services.calculator import recalculate_all_for_month, recalculate_full_matrix
    from apps.macro.models import FXPair
    from datetime import date

    data = request.data

    if data.get("full"):
        n = recalculate_full_matrix()
        return Response({"message": f"Full recalculation complete. {n} pair-months updated."})

    try:
        pair = FXPair.objects.get(symbol=data["pair"])
        month_str = data["month"]
        month = date(int(month_str[:4]), int(month_str[5:7]), 1)
    except (KeyError, ValueError, FXPair.DoesNotExist):
        return Response({"error": "Invalid pair or month."}, status=400)

    score = recalculate_all_for_month(pair.pk, month)
    return Response({
        "pair": pair.symbol,
        "month": month.strftime("%Y-%m"),
        "final_score": score.final_score,
        "bias": score.bias,
        "is_complete": score.is_complete,
    })
