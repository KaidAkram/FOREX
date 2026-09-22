"""Post-save signals — trigger recalculation when data changes."""
from django.db.models.signals import post_save
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender="macro.MacroDataPoint")
def on_macro_data_change(sender, instance, created, **kwargs):
    """
    When a MacroDataPoint is saved, recalculate all (pair, month) combinations
    that involve this country + indicator + month.
    """
    from apps.macro.models import FXPair
    from apps.macro.services.calculator import recalculate_all_for_month

    month = instance.month
    country = instance.country

    # Find all active pairs that have this country as base or quote
    affected_pairs = FXPair.objects.filter(
        is_active=True
    ).filter(
        base_currency=country
    ) | FXPair.objects.filter(
        is_active=True, quote_currency=country
    )

    for pair in affected_pairs.distinct():
        try:
            recalculate_all_for_month(pair.pk, month)
            logger.debug(
                "Recalculated %s | %s after data change.", pair.symbol, month
            )
        except Exception as exc:
            logger.error(
                "Recalculation failed for %s | %s: %s", pair.symbol, month, exc
            )


@receiver(post_save, sender="macro.RatingRule")
def on_rating_rule_change(sender, instance, **kwargs):
    """
    When a RatingRule changes, trigger a full matrix recalculation
    (only affects the indicator this rule belongs to).
    """
    from apps.macro.models import Differential
    from apps.macro.services.calculator import calculate_rating

    diffs = Differential.objects.filter(
        indicator=instance.indicator, is_complete=True
    )
    for diff in diffs:
        try:
            calculate_rating(diff.pk)
        except Exception as exc:
            logger.error("Rating recalc failed for diff %d: %s", diff.pk, exc)
