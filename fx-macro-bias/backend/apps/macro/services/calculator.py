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
        Differential, FXPair, MacroDataPoint, MacroIndicator,
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

    indicator = MacroIndicator.objects.get(pk=indicator_id)
    if indicator.slug == "equity":
        # Equity is calculated directly for the FX pair (Synthetic Change vs Index Change)
        diff = Differential.objects.filter(
            pair_id=pair_id, indicator_id=indicator_id, month=month
        ).first()
        if diff and diff.base_value is not None and diff.quote_value is not None:
            diff.difference = float(diff.base_value - diff.quote_value)
            diff.is_complete = True
            diff.save()
            return diff

    if indicator.slug == "fx_reserves":
        # 12-Month rolling average of monthly differences per 'Calcul du différentiel — FX Reserves Exchange.docx'
        def _get_12m_flow(country_id) -> Optional[float]:
            if isinstance(month, str):
                y, m = [int(x) for x in month[:7].split("-")]
            else:
                y, m = month.year, month.month

            months_to_fetch = []
            for k in range(13):
                cur_m = m - k
                cur_y = y
                while cur_m <= 0:
                    cur_m += 12
                    cur_y -= 1
                months_to_fetch.append(f"{cur_y}-{cur_m:02d}-01")

            dps = {
                dp.month.strftime("%Y-%m-%d"): dp.value
                for dp in MacroDataPoint.objects.filter(
                    country_id=country_id,
                    indicator_id=indicator_id,
                    month__in=months_to_fetch,
                    is_active_value=True,
                )
            }
            deltas = []
            for k in range(12):
                cur_dt = months_to_fetch[k]
                prev_dt = months_to_fetch[k + 1]
                if cur_dt in dps and prev_dt in dps:
                    deltas.append(float(dps[cur_dt] - dps[prev_dt]))

            if deltas:
                return float(sum(deltas) / len(deltas))
            return None

        base_val = _get_12m_flow(pair.base_currency_id)
        quote_val = _get_12m_flow(pair.quote_currency_id)
        diff_val = None
        is_complete = False
        if base_val is not None and quote_val is not None:
            diff_val = float(base_val - quote_val)
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

    base_val = _get_value(pair.base_currency_id)
    quote_val = _get_value(pair.quote_currency_id)

    diff_val = None
    is_complete = False
    if base_val is not None and quote_val is not None:
        diff_val = float(base_val - quote_val)
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


# Official Rating Grids from rating rule.docx & EXCEL8EXAMPLE.xlsx
GDP_GRID_X = [5.0, 4.0, 3.0, 2.0, 1.0, 0.0, -1.0, -2.0, -3.0, -4.0, -5.0]
GDP_GRID_Y = [10, 8, 6, 4, 2, 0, -2, -4, -6, -8, -10]

CA_GRID_X = [14.0, 12.0, 11.0, 10.0, 9.0, 8.0, 7.0, 6.0, 4.0, 2.0, 0.0,
             -2.0, -4.0, -6.0, -7.0, -8.0, -9.0, -10.0, -11.0, -12.0, -14.0]
CA_GRID_Y = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
             -1, -2, -3, -4, -5, -6, -7, -8, -9, -10]

FX_GRID_X = [-2000.0 + 200.0 * i for i in range(21)]
FX_GRID_Y = [10 - i for i in range(21)]

IR_GRID_X = [7.0, 6.5, 6.0, 5.5, 5.0, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.0,
             -0.5, -1.0, -1.5, -2.0, -2.5, -3.0, -3.5, -4.0, -4.5, -5.0, -5.5, -6.0, -6.5, -7.0]
IR_GRID_Y = [3, 4, 5, 6, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
             -1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -6, -5, -4, -3]

# Official 17-step CPI Inflation Rating Scale
CPI_GRID_X = [-2.0, -1.75, -1.5, -1.25, -1.0, -0.75, -0.5, -0.25, 0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]
CPI_GRID_Y = [2, 3, 4, 6, 10, 8, 6, 4, 0, -4, -6, -8, -10, 6, 8, 9, 10]

EQ_GRID_X = [0.25, 0.20, 0.18, 0.16, 0.14, 0.12, 0.10, 0.08, 0.06, 0.04, 0.02, 0.00,
             -0.02, -0.04, -0.06, -0.08, -0.10, -0.12, -0.14, -0.16, -0.18, -0.20, -0.25]
EQ_GRID_Y = [2, 3, 5, 7, 9, 10, 9, 7, 5, 3, 2, 0,
             -2, -3, -5, -7, -9, -10, -9, -7, -5, -3, -2]

def nearest_grid_rating(val: float, grid_x: list[float], grid_y: list[int]) -> int:
    min_x, max_x = min(grid_x), max(grid_x)
    clamped = max(min_x, min(max_x, float(val)))
    idx = min(range(len(grid_x)), key=lambda i: abs(grid_x[i] - clamped))
    return int(grid_y[idx])


def apply_rating_rule(diff_value: float, indicator_id: int) -> tuple[Optional[int], Optional["RatingRule"]]:
    """
    Look up the active rating for this indicator and differential value according to rating rule.docx.
    Returns (rating_value, rule_instance).
    """
    from apps.macro.models import MacroIndicator, RatingRule

    indicator = MacroIndicator.objects.get(pk=indicator_id)
    if indicator.slug == "gdp":
        return nearest_grid_rating(diff_value, GDP_GRID_X, GDP_GRID_Y), None
    if indicator.slug == "ca_gdp":
        return nearest_grid_rating(diff_value, CA_GRID_X, CA_GRID_Y), None
    if indicator.slug == "fx_reserves":
        return nearest_grid_rating(diff_value, FX_GRID_X, FX_GRID_Y), None
    if indicator.slug == "interest_rate":
        return nearest_grid_rating(diff_value, IR_GRID_X, IR_GRID_Y), None
    if indicator.slug == "cpi":
        return nearest_grid_rating(diff_value, CPI_GRID_X, CPI_GRID_Y), None
    if indicator.slug == "equity":
        return nearest_grid_rating(diff_value, EQ_GRID_X, EQ_GRID_Y), None

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
    High-performance batched calculation of the full macroeconomic matrix:
    Pre-caches all MacroDataPoints into an in-memory dictionary O(1) lookup,
    computes differentials, official grid ratings, and final scores, and bulk persists.
    Reduces execution time from ~430 seconds down to ~0.5 seconds.
    """
    from apps.macro.models import FXPair, MacroIndicator, MacroDataPoint, Differential, Rating, FinalScore
    from apps.macro.signals import disable_macro_signals

    pairs = list(FXPair.objects.filter(is_active=True).select_related("base_currency", "quote_currency"))
    indicators = list(MacroIndicator.objects.filter(is_active=True))
    active_indicator_count = len(indicators)
    months = list(
        MacroDataPoint.objects.filter(is_active_value=True)
        .values_list("month", flat=True)
        .distinct()
        .order_by("month")
    )

    if not pairs or not months or not indicators:
        return 0

    # 1. Preload active MacroDataPoints into O(1) dictionary
    dps_dict = {}
    for dp in MacroDataPoint.objects.filter(is_active_value=True).values("country_id", "indicator_id", "month", "value"):
        m_str = dp["month"].strftime("%Y-%m-%d") if hasattr(dp["month"], "strftime") else str(dp["month"])[:10]
        dps_dict[(dp["country_id"], dp["indicator_id"], m_str)] = float(dp["value"]) if dp["value"] is not None else None

    # Pre-fetch existing differentials and ratings into memory
    diff_map = {
        (d.pair_id, d.indicator_id, d.month.strftime("%Y-%m-%d") if hasattr(d.month, "strftime") else str(d.month)[:10]): d
        for d in Differential.objects.all()
    }
    rating_map = {
        r.differential_id: r
        for r in Rating.objects.all()
    }
    score_map = {
        (s.pair_id, s.month.strftime("%Y-%m-%d") if hasattr(s.month, "strftime") else str(s.month)[:10]): s
        for s in FinalScore.objects.all()
    }

    diffs_to_create = []
    diffs_to_update = []
    ratings_to_create = []
    ratings_to_update = []
    scores_to_create = []
    scores_to_update = []

    now_utc = datetime.now(tz=timezone.utc)

    with disable_macro_signals():
        for pair in pairs:
            for month in months:
                m_str = month.strftime("%Y-%m-%d") if hasattr(month, "strftime") else str(month)[:10]
                y = int(m_str[:4])
                m = int(m_str[5:7])

                total_rating = 0.0
                n_complete = 0
                rule_snapshot = {}

                for ind in indicators:
                    diff_obj = diff_map.get((pair.pk, ind.pk, m_str))
                    base_val = None
                    quote_val = None
                    diff_val = None
                    is_complete = False

                    if ind.slug == "equity":
                        # Equity preserves pair-level differential
                        if diff_obj and diff_obj.base_value is not None and diff_obj.quote_value is not None:
                            base_val = float(diff_obj.base_value)
                            quote_val = float(diff_obj.quote_value)
                            diff_val = round(base_val - quote_val, 4)
                            is_complete = True
                    elif ind.slug == "fx_reserves":
                        # 12-month rolling average in memory
                        def _calc_flow(cid):
                            months_fetch = []
                            for k in range(13):
                                cur_m = m - k
                                cur_y = y
                                while cur_m <= 0:
                                    cur_m += 12
                                    cur_y -= 1
                                months_fetch.append(f"{cur_y}-{cur_m:02d}-01")
                            deltas = []
                            for k in range(12):
                                val_cur = dps_dict.get((cid, ind.pk, months_fetch[k]))
                                val_prev = dps_dict.get((cid, ind.pk, months_fetch[k + 1]))
                                if val_cur is not None and val_prev is not None:
                                    deltas.append(val_cur - val_prev)
                            return sum(deltas) / len(deltas) if deltas else None

                        base_val = _calc_flow(pair.base_currency_id)
                        quote_val = _calc_flow(pair.quote_currency_id)
                        if base_val is not None and quote_val is not None:
                            diff_val = round(base_val - quote_val, 2)
                            is_complete = True
                    else:
                        base_val = dps_dict.get((pair.base_currency_id, ind.pk, m_str))
                        quote_val = dps_dict.get((pair.quote_currency_id, ind.pk, m_str))
                        if base_val is not None and quote_val is not None:
                            diff_val = round(base_val - quote_val, 4)
                            is_complete = True

                    # Update or create Differential
                    if diff_obj:
                        diff_obj.base_value = base_val
                        diff_obj.quote_value = quote_val
                        diff_obj.difference = diff_val
                        diff_obj.is_complete = is_complete
                        diffs_to_update.append(diff_obj)
                    else:
                        diff_obj = Differential(
                            pair=pair,
                            indicator=ind,
                            month=month,
                            base_value=base_val,
                            quote_value=quote_val,
                            difference=diff_val,
                            is_complete=is_complete,
                        )
                        diffs_to_create.append(diff_obj)
                        diff_map[(pair.pk, ind.pk, m_str)] = diff_obj

                    # Rating calculation
                    rating_val = None
                    if is_complete and diff_val is not None:
                        if ind.slug == "gdp":
                            rating_val = nearest_grid_rating(diff_val, GDP_GRID_X, GDP_GRID_Y)
                        elif ind.slug == "ca_gdp":
                            rating_val = nearest_grid_rating(diff_val, CA_GRID_X, CA_GRID_Y)
                        elif ind.slug == "fx_reserves":
                            rating_val = nearest_grid_rating(diff_val, FX_GRID_X, FX_GRID_Y)
                        elif ind.slug == "interest_rate":
                            rating_val = nearest_grid_rating(diff_val, IR_GRID_X, IR_GRID_Y)
                        elif ind.slug == "cpi":
                            rating_val = nearest_grid_rating(diff_val, CPI_GRID_X, CPI_GRID_Y)
                        elif ind.slug == "equity":
                            rating_val = nearest_grid_rating(diff_val, EQ_GRID_X, EQ_GRID_Y)
                        else:
                            rating_val, _ = apply_rating_rule(diff_val, ind.pk)

                    if rating_val is not None:
                        total_rating += rating_val
                        n_complete += 1

                    if diff_obj.pk:
                        rat_obj = rating_map.get(diff_obj.pk)
                        if rat_obj:
                            rat_obj.rating_value = rating_val
                            ratings_to_update.append(rat_obj)
                        else:
                            rat_obj = Rating(differential=diff_obj, rating_value=rating_val)
                            ratings_to_create.append(rat_obj)
                            rating_map[diff_obj.pk] = rat_obj

                # FinalScore calculation
                is_score_complete = (n_complete == active_indicator_count and active_indicator_count > 0)
                final_score = round(total_rating / active_indicator_count, 4) if active_indicator_count > 0 else None
                bias = None
                if final_score is not None:
                    if final_score > FinalScore.UP_THRESHOLD:
                        bias = FinalScore.Bias.UP
                    elif final_score < FinalScore.DOWN_THRESHOLD:
                        bias = FinalScore.Bias.DOWN
                    else:
                        bias = FinalScore.Bias.NEUTRAL

                score_obj = score_map.get((pair.pk, m_str))
                if score_obj:
                    score_obj.total_rating = total_rating
                    score_obj.final_score = final_score
                    score_obj.bias = bias
                    score_obj.n_indicators = active_indicator_count
                    score_obj.n_complete = n_complete
                    score_obj.is_complete = is_score_complete
                    score_obj.calculated_at = now_utc
                    scores_to_update.append(score_obj)
                else:
                    score_obj = FinalScore(
                        pair=pair,
                        month=month,
                        total_rating=total_rating,
                        final_score=final_score,
                        bias=bias,
                        n_indicators=active_indicator_count,
                        n_complete=n_complete,
                        is_complete=is_score_complete,
                        calculated_at=now_utc,
                    )
                    scores_to_create.append(score_obj)
                    score_map[(pair.pk, m_str)] = score_obj

        # Batch write to SQLite in transaction
        if diffs_to_create:
            Differential.objects.bulk_create(diffs_to_create, batch_size=500)
        if diffs_to_update:
            Differential.objects.bulk_update(diffs_to_update, ["base_value", "quote_value", "difference", "is_complete"], batch_size=500)

        if ratings_to_create:
            Rating.objects.bulk_create(ratings_to_create, batch_size=500)
        if ratings_to_update:
            Rating.objects.bulk_update(ratings_to_update, ["rating_value"], batch_size=500)

        if scores_to_create:
            FinalScore.objects.bulk_create(scores_to_create, batch_size=500)
        if scores_to_update:
            FinalScore.objects.bulk_update(scores_to_update, ["total_rating", "final_score", "bias", "n_indicators", "n_complete", "is_complete", "calculated_at"], batch_size=500)

    count = len(scores_to_update) + len(scores_to_create)
    logger.info("High-performance matrix recalculation complete: %d pair-months updated in batch.", count)
    return count

