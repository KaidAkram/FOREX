"""
Calculation engine — FX Macro Bias
Implements: Differential → Rating → FinalScore → Bias
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from django.db import transaction

logger = logging.getLogger(__name__)


def calculate_differential(pair_id: int, indicator_id: int, month) -> "Differential":
    """
    (Re)compute the Differential for a (pair, indicator, month).
    Reads only active MacroDataPoints.
    """
    from apps.macro.models import (
        Differential, FXPair, MacroDataPoint,
    )

    pair = FXPair.objects.select_related("base_currency", "quote_currency").get(pk=pair_id)

    def _get_value(country_id) -> Optional[float]:
        try:
            dp = MacroDataPoint.objects.filter(
                country_id=country_id,
                indicator_id=indicator_id,
                month=month,
                is_active_value=True,
            ).latest("published_at", "updated_at")
            return dp.value
        except MacroDataPoint.DoesNotExist:
            return None

    base_val = _get_value(pair.base_currency_id)
    quote_val = _get_value(pair.quote_currency_id)

    diff_val = None
    is_complete = False
    if base_val is not None and quote_val is not None:
        diff_val = round(base_val - quote_val, 6)
        is_complete = True

    diff, _ = Differential.objects.update_or_create(
        pair_id=pair_id,
        indicator_id=indicator_id,
        month=month,
        defaults={
            "base_value": base_val,
            "quote_value": quote_val,
            "difference": diff_val,
            "is_complete": is_complete,
        },
    )
    return diff


def apply_rating_rule(diff_value: float, indicator_id: int) -> tuple[Optional[int], Optional["RatingRule"]]:
    """
    Look up the active RatingRule for this indicator and differential value.
    Returns (rating_value, rule_instance) or (None, None) if no rule matches.
    """
    from apps.macro.models import RatingRule

    rules = RatingRule.objects.filter(indicator_id=indicator_id, is_active=True).order_by("min_diff")
    for rule in rules:
        lo_ok = rule.min_diff is None or diff_value >= rule.min_diff
        hi_ok = rule.max_diff is None or diff_value < rule.max_diff
        if lo_ok and hi_ok:
            return rule.rating, rule
    return None, None


def calculate_rating(differential_id: int) -> "Rating":
    """(Re)compute the Rating for a Differential."""
    from apps.macro.models import Differential, Rating, RuleVersion

    diff = Differential.objects.select_related("indicator").get(pk=differential_id)
    rating_val = None
    applied_rule = None
    rule_version = None

    if diff.is_complete and diff.difference is not None:
        rating_val, applied_rule = apply_rating_rule(diff.difference, diff.indicator_id)
        if applied_rule and applied_rule.version:
            rule_version = applied_rule.version

    rating, _ = Rating.objects.update_or_create(
        differential_id=differential_id,
        defaults={
            "rating_value": rating_val,
            "applied_rule": applied_rule,
            "rule_version": rule_version,
        },
    )
    return rating


def calculate_final_score(pair_id: int, month) -> "FinalScore":
    """
    (Re)compute FinalScore for a (pair, month).
    Reads all active indicator Ratings for that pair/month.
    FinalScore = Σ(rating_values) / n_active_indicators
    Bias: score > UP_THRESHOLD → UP, score < DOWN_THRESHOLD → DOWN, else NEUTRAL
    """
    from apps.macro.models import (
        FinalScore, MacroIndicator, Rating, Differential,
    )

    active_indicators = MacroIndicator.objects.filter(is_active=True)
    n_indicators = active_indicators.count()

    total_rating = 0.0
    n_complete = 0
    rule_snapshot = {}

    for indicator in active_indicators:
        try:
            diff = Differential.objects.get(pair_id=pair_id, indicator=indicator, month=month)
            if diff.is_complete:
                try:
                    rat = diff.rating
                    if rat.rating_value is not None:
                        total_rating += rat.rating_value
                        n_complete += 1
                        if rat.rule_version:
                            rule_snapshot[indicator.slug] = str(rat.rule_version)
                except Rating.DoesNotExist:
                    pass
        except Differential.DoesNotExist:
            pass

    is_complete = n_complete == n_indicators and n_indicators > 0
    final_score = round(total_rating / n_indicators, 4) if n_indicators > 0 else None

    bias = None
    if final_score is not None:
        if final_score > FinalScore.UP_THRESHOLD:
            bias = FinalScore.Bias.UP
        elif final_score < FinalScore.DOWN_THRESHOLD:
            bias = FinalScore.Bias.DOWN
        else:
            bias = FinalScore.Bias.NEUTRAL

    score, _ = FinalScore.objects.update_or_create(
        pair_id=pair_id,
        month=month,
        defaults={
            "total_rating": total_rating,
            "final_score": final_score,
            "bias": bias,
            "n_indicators": n_indicators,
            "n_complete": n_complete,
            "is_complete": is_complete,
            "rule_version_snapshot": rule_snapshot,
            "calculated_at": datetime.now(tz=timezone.utc),
        },
    )
    return score


@transaction.atomic
def recalculate_all_for_month(pair_id: int, month) -> "FinalScore":
    """
    Full pipeline recalculation for a (pair, month):
    1. Differential for each active indicator
    2. Rating for each differential
    3. FinalScore
    """
    from apps.macro.models import MacroIndicator

    for indicator in MacroIndicator.objects.filter(is_active=True):
        diff = calculate_differential(pair_id, indicator.pk, month)
        calculate_rating(diff.pk)

    return calculate_final_score(pair_id, month)


@transaction.atomic
def recalculate_full_matrix() -> int:
    """
    Recalculate every (pair, month) combination that has any data.
    Returns the number of FinalScore records updated.
    """
    from apps.macro.models import FXPair, MacroDataPoint

    pairs = FXPair.objects.filter(is_active=True)
    months = (
        MacroDataPoint.objects.filter(is_active_value=True)
        .values_list("month", flat=True)
        .distinct()
        .order_by("month")
    )

    count = 0
    for pair in pairs:
        for month in months:
            recalculate_all_for_month(pair.pk, month)
            count += 1

    logger.info("Full matrix recalculation complete: %d pair-months updated.", count)
    return count
