"""Final Score views — matrix and drill-down."""
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def score_matrix(request):
    """
    Full Pair × Month score matrix.
    Returns all active pairs and all months that have FinalScore data.
    """
    from apps.macro.models import FinalScore, FXPair

    pairs = FXPair.objects.filter(is_active=True).order_by("symbol")
    scores = (
        FinalScore.objects.filter(pair__is_active=True)
        .select_related("pair")
        .order_by("pair__symbol", "month")
    )

    # Collect all months
    months_set = set()
    score_map: dict = {}
    for s in scores:
        key = s.pair.symbol
        month_str = s.month.strftime("%Y-%m")
        months_set.add(month_str)
        if key not in score_map:
            score_map[key] = {}
        score_map[key][month_str] = {
            "final_score": s.final_score,
            "bias": s.bias,
            "is_complete": s.is_complete,
            "n_complete": s.n_complete,
            "n_indicators": s.n_indicators,
        }

    months = sorted(months_set)
    rows = [
        {
            "pair": p.symbol,
            "cells": {m: score_map.get(p.symbol, {}).get(m) for m in months},
        }
        for p in pairs
    ]

    return Response({
        "months": months,
        "rows": rows,
    })


@api_view(["GET"])
def score_drilldown(request):
    """
    Drill-down detail for a (pair, month).
    ?pair=EUR/USD&month=2026-01
    Returns per-indicator rating breakdown + total + final score + bias.
    """
    from apps.macro.models import FinalScore, FXPair, MacroIndicator, Differential
    from datetime import date

    pair_symbol = request.query_params.get("pair", "EUR/USD")
    month_str = request.query_params.get("month")

    if not month_str:
        return Response({"error": "month parameter required."}, status=400)

    try:
        pair = FXPair.objects.select_related("base_currency", "quote_currency").get(
            symbol=pair_symbol
        )
        month = date(int(month_str[:4]), int(month_str[5:7]), 1)
        score = FinalScore.objects.get(pair=pair, month=month)
    except (FXPair.DoesNotExist, FinalScore.DoesNotExist):
        return Response({"error": "No score found for this pair/month."}, status=404)
    except (ValueError, IndexError):
        return Response({"error": "Invalid month format. Use YYYY-MM."}, status=400)

    # Per-indicator breakdown
    indicators = MacroIndicator.objects.filter(is_active=True).order_by("display_order")
    breakdown = []
    for ind in indicators:
        try:
            diff = Differential.objects.select_related("rating", "rating__applied_rule").get(
                pair=pair, indicator=ind, month=month
            )
            try:
                rating_val = diff.rating.rating_value
                rule_str = str(diff.rating.applied_rule) if diff.rating.applied_rule else "—"
            except Exception:
                rating_val = None
                rule_str = "—"

            breakdown.append({
                "indicator": ind.name,
                "slug": ind.slug,
                "base_value": diff.base_value,
                "quote_value": diff.quote_value,
                "difference": diff.difference,
                "rating": rating_val,
                "applied_rule": rule_str,
                "is_complete": diff.is_complete,
            })
        except Differential.DoesNotExist:
            breakdown.append({
                "indicator": ind.name,
                "slug": ind.slug,
                "base_value": None,
                "quote_value": None,
                "difference": None,
                "rating": None,
                "applied_rule": "—",
                "is_complete": False,
            })

    return Response({
        "pair": pair_symbol,
        "month": month_str,
        "base_currency": pair.base_currency.name,
        "quote_currency": pair.quote_currency.name,
        "breakdown": breakdown,
        "total_rating": score.total_rating,
        "final_score": score.final_score,
        "bias": score.bias,
        "is_complete": score.is_complete,
        "calculated_at": score.calculated_at,
        "rule_version_snapshot": score.rule_version_snapshot,
    })
