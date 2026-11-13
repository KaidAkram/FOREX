from rest_framework.decorators import api_view, throttle_classes
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.response import Response
from rest_framework import status



@api_view(["GET"])
def macro_matrix(request):
    """
    Country × Month matrix for a given indicator (or pair-level matrix for Equity).
    ?indicator=gdp  (default: gdp)
    """
    import json
    from pathlib import Path
    from apps.macro.models import MacroDataPoint, MacroIndicator, Country, Differential, FXPair, SystemSetting
    from apps.macro.services.calendar import get_active_horizon_months

    indicator_slug = request.query_params.get("indicator", "gdp")
    try:
        indicator = MacroIndicator.objects.get(slug=indicator_slug)
    except MacroIndicator.DoesNotExist:
        return Response({"error": "Indicator not found."}, status=404)

    # Include active year calendar months plus the N+3 forward horizon automatically.
    months_set: set = get_active_horizon_months(forward_count=3)

    if indicator.slug == "equity":
        # Per Equity Indicator2.pdf, Equity is calculated directly per FX pair (no country table).
        pairs = FXPair.objects.filter(is_active=True).select_related("base_currency", "quote_currency").order_by("symbol")
        diffs = (
            Differential.objects.filter(indicator=indicator, pair__is_active=True)
            .select_related("pair", "rating")
            .order_by("pair__symbol", "month")
        )
        details = SystemSetting.objects.filter(key='equity_details').first()
        cache_pairs = details.value if details else {}

        pair_map: dict = {}
        for d in diffs:
            month_str = d.month.strftime("%Y-%m")
            months_set.add(month_str)
            sym = d.pair.symbol
            try:
                rat_val = d.rating.rating_value
            except Exception:
                rat_val = None
            cached_pt = (cache_pairs.get(sym) or cache_pairs.get(sym.replace("/", " ")) or {}).get(month_str, {})
            pair_map.setdefault(sym, {})[month_str] = {
                "change_index": d.base_value,
                "change_synth": d.quote_value,
                "final_change": d.difference,
                "rating": rat_val,
                "is_complete": d.is_complete,
                "base_cur": cached_pt.get("base_cur"),
                "base_ath": cached_pt.get("base_ath"),
                "synth_cur": cached_pt.get("synth_cur"),
                "synth_ath": cached_pt.get("synth_ath"),
                "as_of_date": cached_pt.get("as_of_date"),
                "is_provisional": cached_pt.get("is_provisional", False),
            }

        months = sorted(months_set)
        pair_rows = [
            {
                "pair": p.symbol,
                "base_currency": p.base_currency.iso_code,
                "quote_currency": p.quote_currency.iso_code,
                "cells": {m: pair_map.get(p.symbol, {}).get(m) for m in months},
            }
            for p in pairs
        ]
        refresh = SystemSetting.objects.filter(key="equity_refresh").first()
        return Response({
            "indicator": indicator.name,
            "slug": indicator.slug,
            "mode": "pair",
            "months": months,
            "rows": [],
            "pair_rows": pair_rows,
            "freshness": refresh.value if refresh else None,
        })

    countries = Country.objects.filter(is_active=True).order_by("name")
    points = (
        MacroDataPoint.objects.filter(indicator=indicator, is_active_value=True)
        .select_related("country")
        .order_by("country__name", "month")
    )

    # Build {country_iso: {month_str: {value, status}}}
    matrix: dict = {}

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

    payload = {
        "indicator": indicator.name,
        "slug": indicator.slug,
        "months": months,
        "rows": rows,
    }
    if indicator.slug == "fx_reserves":
        refresh = SystemSetting.objects.filter(key="fx_reserves_refresh").first()
        payload["freshness"] = refresh.value if refresh else None
    return Response(payload)


@api_view(["POST"])
@throttle_classes([ScopedRateThrottle])
def manual_entry(request):
    """
    Admin manually enters or clears a value for (country, indicator, month).
    Rate-limited to 30 requests per minute to prevent abuse.
    """
    from apps.macro.models import MacroDataPoint, Country, MacroIndicator, FXPair
    from apps.macro.services.calculator import recalculate_all_for_month
    from datetime import date

    data = request.data
    try:
        c_code = data.get("country_iso") or data.get("country")
        country = Country.objects.filter(iso_code__iexact=c_code).first() or Country.objects.filter(name__iexact=c_code).first()
        if not country:
            return Response({"error": f"Country '{c_code}' not found."}, status=404)

        indicator_slug = data.get("indicator_slug") or data.get("indicator")
        indicator = MacroIndicator.objects.filter(slug__iexact=indicator_slug).first()
        if not indicator:
            return Response({"error": f"Indicator '{indicator_slug}' not found."}, status=404)

        month_str = str(data.get("month", "")).strip()
        if len(month_str) == 7:  # YYYY-MM
            month_str += "-01"
        month = date.fromisoformat(month_str)
    except (KeyError, ValueError) as e:
        return Response({"error": str(e)}, status=400)

    # Check if published value already exists — don't override it
    existing_published = MacroDataPoint.objects.filter(
        country=country,
        indicator=indicator,
        month=month,
        status__in=["published", "revised"],
        is_active_value=True,
    ).first()

    if existing_published:
        return Response(
            {"error": "A published value already exists for this entry. Manual override not allowed."},
            status=409,
        )

    # Check if this is a request to clear/delete the manual entry
    if data.get("clear") is True or data.get("value") is None or str(data.get("value")).strip() == "":
        MacroDataPoint.objects.filter(
            country=country, indicator=indicator, month=month, status="manual"
        ).delete()

        affected_pairs = FXPair.objects.filter(
            is_active=True
        ).filter(
            base_currency=country
        ) | FXPair.objects.filter(
            is_active=True, quote_currency=country
        )
        for pair in affected_pairs.distinct():
            recalculate_all_for_month(pair.pk, month)

        return Response({
            "country": country.name,
            "iso": country.iso_code,
            "indicator": indicator.name,
            "month": month.strftime("%Y-%m"),
            "value": None,
            "status": "missing",
            "cleared": True,
        }, status=200)

    try:
        value = float(data["value"])
    except (ValueError, TypeError):
        return Response({"error": "Invalid numeric value."}, status=400)

    # Check if a manual entry already exists for this (country, indicator, month)
    existing_manual = MacroDataPoint.objects.filter(
        country=country, indicator=indicator, month=month, status="manual"
    ).first()

    if existing_manual:
        existing_manual.value = value
        existing_manual.is_active_value = True
        existing_manual.source = f"Manual entry by {getattr(request.user, 'username', 'admin')}"
        existing_manual.notes = data.get("notes", "")
        existing_manual.save()
        dp = existing_manual
    else:
        # Purge any lingering non-published/inactive rows to prevent constraint collision
        MacroDataPoint.objects.filter(
            country=country, indicator=indicator, month=month
        ).exclude(status__in=["published", "revised"]).delete()

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
        "iso": country.iso_code,
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
@throttle_classes([ScopedRateThrottle])
def trigger_recalculation(request):
    """
    Trigger recalculation for a specific (pair, month) or full matrix.
    Rate-limited to 5 requests per minute.
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

manual_entry.throttle_scope = "manual_entry"
trigger_recalculation.throttle_scope = "scraper_trigger"

