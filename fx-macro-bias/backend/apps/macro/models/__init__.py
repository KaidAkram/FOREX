"""
Core macro models — FX Macro Bias
Pipeline: MacroDataPoint → Differential → Rating → FinalScore → Bias
"""
from django.db import models
from apps.common.models import TimestampedModel


# ──────────────────────────────────────────────────────────
# DIMENSION TABLES
# ──────────────────────────────────────────────────────────

class Country(TimestampedModel):
    """G10 sovereign economy."""

    name = models.CharField(max_length=100, unique=True)
    iso_code = models.CharField(max_length=3, unique=True)          # USD, EUR, JPY …
    trading_economics_slug = models.CharField(max_length=100, blank=True)  # united-states
    yfinance_equity_ticker = models.CharField(max_length=20, blank=True)   # ^GSPC
    imf_country_code = models.CharField(max_length=10, blank=True)         # USA
    oecd_country_code = models.CharField(max_length=10, blank=True)        # USA
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "countries"

    def __str__(self):
        return f"{self.name} ({self.iso_code})"


class MacroIndicator(TimestampedModel):
    """One of the 6 macro pillars tracked by the model."""

    class Frequency(models.TextChoices):
        MONTHLY = "M", "Monthly"
        QUARTERLY = "Q", "Quarterly"
        WEEKLY = "W", "Weekly"

    class Source(models.TextChoices):
        TRADING_ECONOMICS = "TE", "TradingEconomics (WARI Scraper)"
        IMF = "IMF", "IMF SDMX API"
        OECD = "OECD", "OECD SDMX API"
        YFINANCE = "YF", "yfinance"
        MANUAL = "MAN", "Manual Entry"

    slug = models.CharField(max_length=50, unique=True)   # gdp, cpi, interest_rate …
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    frequency = models.CharField(max_length=1, choices=Frequency.choices, default=Frequency.MONTHLY)
    default_source = models.CharField(max_length=5, choices=Source.choices)
    weight = models.FloatField(default=1.0)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "name"]

    def __str__(self):
        return self.name


class FXPair(TimestampedModel):
    """A currency pair — base / quote mapping to Country rows."""

    base_currency = models.ForeignKey(
        Country, on_delete=models.PROTECT, related_name="base_pairs"
    )
    quote_currency = models.ForeignKey(
        Country, on_delete=models.PROTECT, related_name="quote_pairs"
    )
    symbol = models.CharField(max_length=10, unique=True)  # EUR/USD
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["symbol"]

    def __str__(self):
        return self.symbol


# ──────────────────────────────────────────────────────────
# RATING RULES (versioned)
# ──────────────────────────────────────────────────────────

class RuleVersion(TimestampedModel):
    """Immutable snapshot of a rule set for reproducibility."""

    indicator = models.ForeignKey(
        MacroIndicator, on_delete=models.PROTECT, related_name="rule_versions"
    )
    version_number = models.PositiveIntegerField()
    notes = models.TextField(blank=True)
    created_by = models.CharField(max_length=100, default="admin")

    class Meta:
        ordering = ["-created_at"]
        unique_together = [["indicator", "version_number"]]

    def __str__(self):
        return f"{self.indicator.slug} v{self.version_number}"


class RatingRule(TimestampedModel):
    """
    Maps a differential range to a rating score.
    Differential = base_value − quote_value for a given indicator and pair.
    """

    indicator = models.ForeignKey(
        MacroIndicator, on_delete=models.PROTECT, related_name="rating_rules"
    )
    version = models.ForeignKey(
        RuleVersion, on_delete=models.PROTECT, related_name="rules", null=True, blank=True
    )
    # None = −∞,  use null for open-ended bounds
    min_diff = models.FloatField(null=True, blank=True)   # inclusive lower bound (≥)
    max_diff = models.FloatField(null=True, blank=True)   # exclusive upper bound (<)
    rating = models.IntegerField()                         # e.g. −10, −5, 0, +5, +10
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["indicator", "min_diff"]

    def __str__(self):
        lo = self.min_diff if self.min_diff is not None else "-∞"
        hi = self.max_diff if self.max_diff is not None else "+∞"
        return f"{self.indicator.slug}: [{lo}, {hi}) → {self.rating}"


# ──────────────────────────────────────────────────────────
# MACRO DATA (raw inputs)
# ──────────────────────────────────────────────────────────

class MacroDataPoint(TimestampedModel):
    """
    One cell in the macro matrix: country × indicator × month → value.

    Published values (scraped or API) always win over manual values.
    When a published value arrives for a (country, indicator, month) that
    already has a manual entry, the signal in signals.py demotes the manual
    entry and promotes the published one.
    """

    class Status(models.TextChoices):
        PUBLISHED = "published", "Published"
        MANUAL = "manual", "Manual Override"
        REVISED = "revised", "Revised"
        MISSING = "missing", "Missing"

    country = models.ForeignKey(Country, on_delete=models.PROTECT, related_name="data_points")
    indicator = models.ForeignKey(
        MacroIndicator, on_delete=models.PROTECT, related_name="data_points"
    )
    # First day of the reference month (always stored as YYYY-MM-01)
    month = models.DateField(db_index=True)
    value = models.FloatField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PUBLISHED)
    source = models.CharField(max_length=200, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    # When a manual entry is superseded, we keep it for audit purposes
    is_active_value = models.BooleanField(
        default=True,
        help_text="False when a newer published value has superseded this manual entry.",
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["country", "indicator", "month"]
        # Only one active value per (country, indicator, month)
        unique_together = [["country", "indicator", "month", "is_active_value"]]

    def __str__(self):
        return (
            f"{self.country.iso_code} | {self.indicator.slug} | "
            f"{self.month:%Y-%m} = {self.value} [{self.status}]"
        )


# ──────────────────────────────────────────────────────────
# DERIVED TABLES (calculated by engine, never directly edited)
# ──────────────────────────────────────────────────────────

class Differential(TimestampedModel):
    """
    Derived: Difference = base_value − quote_value.
    Recalculated automatically whenever a MacroDataPoint changes.
    """

    pair = models.ForeignKey(FXPair, on_delete=models.CASCADE, related_name="differentials")
    indicator = models.ForeignKey(
        MacroIndicator, on_delete=models.CASCADE, related_name="differentials"
    )
    month = models.DateField(db_index=True)
    base_value = models.FloatField(null=True, blank=True)
    quote_value = models.FloatField(null=True, blank=True)
    difference = models.FloatField(null=True, blank=True)  # base − quote
    is_complete = models.BooleanField(
        default=False,
        help_text="True only when both base and quote values are available.",
    )

    class Meta:
        ordering = ["pair", "indicator", "month"]
        unique_together = [["pair", "indicator", "month"]]

    def __str__(self):
        return (
            f"{self.pair} | {self.indicator.slug} | {self.month:%Y-%m} "
            f"diff={self.difference}"
        )


class Rating(TimestampedModel):
    """
    Derived: maps a Differential to a Rating score using the active RatingRules.
    """

    differential = models.OneToOneField(
        Differential, on_delete=models.CASCADE, related_name="rating"
    )
    rating_value = models.IntegerField(null=True, blank=True)
    applied_rule = models.ForeignKey(
        RatingRule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="applied_ratings",
    )
    rule_version = models.ForeignKey(
        RuleVersion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ratings",
    )

    def __str__(self):
        return (
            f"{self.differential.pair} | {self.differential.indicator.slug} | "
            f"{self.differential.month:%Y-%m} → rating={self.rating_value}"
        )


class FinalScore(TimestampedModel):
    """
    Derived: aggregates all indicator ratings for a (pair, month) → final score & bias.
    FinalScore = Σ(indicator_ratings) / n_active_indicators
    Bias: UP if score > threshold, DOWN if score < -threshold, else NEUTRAL
    """

    class Bias(models.TextChoices):
        UP = "UP", "UP"
        DOWN = "DOWN", "DOWN"
        NEUTRAL = "NEUTRAL", "NEUTRAL"

    UP_THRESHOLD = 1.0
    DOWN_THRESHOLD = -1.0

    pair = models.ForeignKey(FXPair, on_delete=models.CASCADE, related_name="final_scores")
    month = models.DateField(db_index=True)
    total_rating = models.FloatField(null=True, blank=True)   # Σ ratings
    final_score = models.FloatField(null=True, blank=True)    # total / n
    bias = models.CharField(
        max_length=10, choices=Bias.choices, null=True, blank=True
    )
    n_indicators = models.PositiveSmallIntegerField(default=0)
    n_complete = models.PositiveSmallIntegerField(
        default=0, help_text="How many indicators had complete differentials."
    )
    is_complete = models.BooleanField(
        default=False,
        help_text="True only when all active indicators have complete differentials.",
    )
    rule_version_snapshot = models.JSONField(
        default=dict,
        help_text="Snapshot of rule version numbers used at calculation time.",
    )
    calculated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["pair", "month"]
        unique_together = [["pair", "month"]]

    def __str__(self):
        return (
            f"{self.pair} | {self.month:%Y-%m} → "
            f"score={self.final_score} [{self.bias}]"
        )


# ──────────────────────────────────────────────────────────
# AUDIT LOG
# ──────────────────────────────────────────────────────────

class AuditLog(TimestampedModel):
    """Immutable audit trail for all significant admin actions."""

    entity_type = models.CharField(max_length=50)    # MacroDataPoint, RatingRule …
    entity_id = models.CharField(max_length=50)
    action = models.CharField(max_length=50)         # created, updated, deleted, recalculated
    before_value = models.JSONField(null=True, blank=True)
    after_value = models.JSONField(null=True, blank=True)
    user = models.CharField(max_length=100, default="admin")
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.entity_type}#{self.entity_id}] {self.action} by {self.user}"
