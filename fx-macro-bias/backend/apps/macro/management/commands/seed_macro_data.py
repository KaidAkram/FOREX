"""
Management command: seed_macro_data
Parses EXCEL8EXAMPLE.xlsx and seeds the database with:
  - G10 countries
  - 6 macro indicators
  - 21 FX pairs
  - Default rating rules (5-bracket scale from spec)
  - MacroDataPoints for all sheets (GDP, CPI, FX Reserves, IR, CA/GDP, Equity)

Usage:
    python manage.py seed_macro_data --excel path/to/EXCEL8EXAMPLE.xlsx
    python manage.py seed_macro_data --excel path/to/EXCEL8EXAMPLE.xlsx --clear
"""
import os
from datetime import datetime, date
from pathlib import Path
from typing import Optional

import openpyxl
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


# ──────────────────────────────────────────────────────────
# STATIC REFERENCE DATA
# ──────────────────────────────────────────────────────────

G10_COUNTRIES = [
    {
        "name": "United States",
        "iso_code": "USD",
        "trading_economics_slug": "united-states",
        "yfinance_equity_ticker": "^GSPC",
        "imf_country_code": "USA",
        "oecd_country_code": "USA",
    },
    {
        "name": "Euro Area",
        "iso_code": "EUR",
        "trading_economics_slug": "euro-area",
        "yfinance_equity_ticker": "^STOXX50E",
        "imf_country_code": "G163",
        "oecd_country_code": "EA20",
    },
    {
        "name": "Japan",
        "iso_code": "JPY",
        "trading_economics_slug": "japan",
        "yfinance_equity_ticker": "^N225",
        "imf_country_code": "JPN",
        "oecd_country_code": "JPN",
    },
    {
        "name": "United Kingdom",
        "iso_code": "GBP",
        "trading_economics_slug": "united-kingdom",
        "yfinance_equity_ticker": "^FTSE",
        "imf_country_code": "GBR",
        "oecd_country_code": "GBR",
    },
    {
        "name": "Australia",
        "iso_code": "AUD",
        "trading_economics_slug": "australia",
        "yfinance_equity_ticker": "^AXJO",
        "imf_country_code": "AUS",
        "oecd_country_code": "AUS",
    },
    {
        "name": "Canada",
        "iso_code": "CAD",
        "trading_economics_slug": "canada",
        "yfinance_equity_ticker": "^GSPTSE",
        "imf_country_code": "CAN",
        "oecd_country_code": "CAN",
    },
    {
        "name": "Switzerland",
        "iso_code": "CHF",
        "trading_economics_slug": "switzerland",
        "yfinance_equity_ticker": "^SSMI",
        "imf_country_code": "CHE",
        "oecd_country_code": "CHE",
    },
    {
        "name": "New Zealand",
        "iso_code": "NZD",
        "trading_economics_slug": "new-zealand",
        "yfinance_equity_ticker": "^NZ50",
        "imf_country_code": "NZL",
        "oecd_country_code": "NZL",
    },
]

# Maps names used in EXCEL8EXAMPLE.xlsx → our canonical iso_code
EXCEL_COUNTRY_MAP = {
    "united states": "USD",
    "usa": "USD",
    "euro area": "EUR",
    "euro area (19 countries)": "EUR",
    "euro area (20 countries)": "EUR",
    "japan": "JPY",
    "united kingdom": "GBP",
    "uk": "GBP",
    "australia": "AUD",
    "canada": "CAD",
    "switzerland": "CHF",
    "new zealand": "NZD",
    "new zelaand": "NZD",  # typo in the Excel
}

INDICATORS = [
    {
        "slug": "gdp",
        "name": "GDP Growth (Annual %)",
        "frequency": "Q",
        "default_source": "TE",
        "weight": 1.0,
        "display_order": 1,
    },
    {
        "slug": "cpi",
        "name": "CPI Inflation (YoY %)",
        "frequency": "M",
        "default_source": "TE",
        "weight": 1.0,
        "display_order": 2,
    },
    {
        "slug": "interest_rate",
        "name": "Interest Rate (%)",
        "frequency": "M",
        "default_source": "TE",
        "weight": 1.0,
        "display_order": 3,
    },
    {
        "slug": "fx_reserves",
        "name": "FX Reserves Excl. Gold (USD M)",
        "frequency": "M",
        "default_source": "IMF",
        "weight": 1.0,
        "display_order": 4,
    },
    {
        "slug": "ca_gdp",
        "name": "Current Account / GDP (%)",
        "frequency": "Q",
        "default_source": "OECD",
        "weight": 1.0,
        "display_order": 5,
    },
    {
        "slug": "equity",
        "name": "Equity Index Return (%)",
        "frequency": "M",
        "default_source": "YF",
        "weight": 1.0,
        "display_order": 6,
    },
]

# Default 5-bracket rating rules (from PDF spec) per indicator
DEFAULT_RATING_RULES = [
    # (min_diff, max_diff, rating)  — None means open-ended
    (None, -2.0, -10),
    (-2.0, -1.0, -5),
    (-1.0,  1.0,  0),
    ( 1.0,  2.0,  5),
    ( 2.0, None, 10),
]

FX_PAIRS = [
    ("EUR", "USD"), ("USD", "JPY"), ("GBP", "USD"), ("USD", "CHF"),
    ("USD", "CAD"), ("AUD", "USD"), ("NZD", "USD"),
    ("EUR", "JPY"), ("EUR", "GBP"), ("EUR", "CHF"), ("EUR", "CAD"),
    ("EUR", "AUD"), ("EUR", "NZD"),
    ("GBP", "JPY"), ("GBP", "CHF"), ("GBP", "CAD"), ("GBP", "AUD"), ("GBP", "NZD"),
    ("AUD", "JPY"), ("CAD", "JPY"), ("CHF", "JPY"),
]


# ──────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────

def to_date(val) -> Optional[date]:
    """Coerce an Excel date cell value → Python date (first of month)."""
    if isinstance(val, datetime):
        return val.replace(day=1).date()
    if isinstance(val, date):
        return val.replace(day=1)
    return None


def parse_matrix_sheet(ws, country_map: dict, source_label: str) -> list[dict]:
    """
    Parse a Country × Date matrix sheet.
    Expected layout:
      Row 1 or 2: [country_label, date1, date2, …]   (first non-None is the country col)
      Row 2+: [country_name, val1, val2, …]
    Returns list of {country_iso, month, value} dicts.
    """
    rows = list(ws.iter_rows(values_only=True))
    records = []

    # Find header row (one that has date values)
    header_row_idx = None
    dates = []
    for idx, row in enumerate(rows):
        date_cells = [to_date(c) for c in row[1:] if to_date(c)]
        if len(date_cells) >= 3:
            header_row_idx = idx
            # Map column index → date
            for col_idx, cell in enumerate(row[1:], start=1):
                d = to_date(cell)
                if d:
                    dates.append((col_idx, d))
            break

    if header_row_idx is None or not dates:
        return records

    # Parse data rows
    for row in rows[header_row_idx + 1:]:
        country_raw = row[0]
        if not country_raw or not isinstance(country_raw, str):
            continue
        # Stop at sub-table headers or downstream calculation sections (e.g. Monthly Change, 12 Month Average)
        if country_raw.strip().lower() in ["monthly change", "12 month average", "spread", "paire"]:
            break
        iso = country_map.get(country_raw.strip().lower())
        if not iso:
            continue
        for col_idx, month in dates:
            if col_idx < len(row):
                val = row[col_idx]
                if isinstance(val, (int, float)) and val is not None:
                    records.append({
                        "country_iso": iso,
                        "month": month,
                        "value": float(val),
                        "source": source_label,
                    })

    return records


def parse_interest_rates_sheet(ws, country_map: dict) -> list[dict]:
    """
    Interest Rates sheet has an extra None row 1 and 'Country' label in row 2 col 2.
    """
    rows = list(ws.iter_rows(values_only=True))
    records = []
    dates = []
    header_row_idx = None

    for idx, row in enumerate(rows):
        # Look for row with 'Country' in col B
        if len(row) > 1 and row[1] == "Country":
            header_row_idx = idx
            for col_idx, cell in enumerate(row[2:], start=2):
                d = to_date(cell)
                if d:
                    dates.append((col_idx, d))
            break

    if header_row_idx is None:
        return records

    for row in rows[header_row_idx + 1:]:
        if len(row) < 2:
            continue
        country_raw = row[1]
        if not country_raw or not isinstance(country_raw, str):
            continue
        iso = country_map.get(country_raw.strip().lower())
        if not iso:
            continue
        for col_idx, month in dates:
            if col_idx < len(row):
                val = row[col_idx]
                if isinstance(val, (int, float)):
                    records.append({
                        "country_iso": iso,
                        "month": month,
                        "value": float(val),
                        "source": "TradingEconomics (seeded)",
                    })
    return records


# ──────────────────────────────────────────────────────────
# COMMAND
# ──────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Seed the database from EXCEL8EXAMPLE.xlsx and default reference data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--excel",
            type=str,
            default=None,
            help="Absolute path to EXCEL8EXAMPLE.xlsx",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing MacroDataPoints before seeding (keeps dimensions).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from apps.macro.models import (
            Country, MacroIndicator, FXPair,
            RatingRule, RuleVersion, MacroDataPoint,
        )

        excel_path = options["excel"]
        if not excel_path:
            # Try default locations
            candidates = [
                Path(__file__).resolve().parents[6] / "EXCEL8EXAMPLE.xlsx",
                Path("EXCEL8EXAMPLE.xlsx"),
            ]
            for c in candidates:
                if c.exists():
                    excel_path = str(c)
                    break

        if not excel_path or not Path(excel_path).exists():
            raise CommandError(
                f"EXCEL8EXAMPLE.xlsx not found. Pass --excel <path>"
            )

        self.stdout.write(self.style.MIGRATE_HEADING("\n[>>] FX Macro Bias - Seeder Starting"))
        self.stdout.write(f"   Excel: {excel_path}\n")

        # Disconnect signals during bulk insert to avoid O(n*pairs) recalculations.
        # We will call recalculate_full_matrix() once at the end instead.
        from django.db.models.signals import post_save
        from apps.macro import signals as macro_signals
        post_save.disconnect(macro_signals.on_macro_data_change, sender="macro.MacroDataPoint")
        post_save.disconnect(macro_signals.on_rating_rule_change, sender="macro.RatingRule")

        self.stdout.write("[*]  Seeding countries...")
        country_objs = {}
        for c in G10_COUNTRIES:
            obj, created = Country.objects.update_or_create(
                iso_code=c["iso_code"],
                defaults=c,
            )
            country_objs[c["iso_code"]] = obj
            mark = "ok" if not created else "++"
            self.stdout.write(f"   {mark} {obj}")

        # 2. Indicators
        self.stdout.write("\n[*]  Seeding indicators...")
        indicator_objs = {}
        for ind in INDICATORS:
            obj, created = MacroIndicator.objects.update_or_create(
                slug=ind["slug"],
                defaults=ind,
            )
            indicator_objs[ind["slug"]] = obj
            self.stdout.write(f"   {'++' if created else 'ok'} {obj.name}")

        # 3. FX Pairs
        self.stdout.write("\n[*]  Seeding FX pairs...")
        for base_iso, quote_iso in FX_PAIRS:
            symbol = f"{base_iso}/{quote_iso}"
            base = country_objs.get(base_iso)
            quote = country_objs.get(quote_iso)
            if not base or not quote:
                self.stdout.write(self.style.WARNING(f"   !!  Skipping {symbol}: missing country"))
                continue
            _, created = FXPair.objects.update_or_create(
                symbol=symbol,
                defaults={"base_currency": base, "quote_currency": quote},
            )
            self.stdout.write(f"   {'++' if created else '..'} {symbol}")

        # 4. Rating Rules (default 5-bracket scale)
        self.stdout.write("\n[*]  Seeding default rating rules...")
        for ind_slug, ind_obj in indicator_objs.items():
            # Create a version snapshot
            latest_version = (
                RuleVersion.objects.filter(indicator=ind_obj)
                .order_by("-version_number")
                .first()
            )
            version_number = (latest_version.version_number + 1) if latest_version else 1
            version_obj, _ = RuleVersion.objects.get_or_create(
                indicator=ind_obj,
                version_number=version_number,
                defaults={"notes": "Default seed rules from spec"},
            )
            # Only create if no rules exist for this indicator
            if not RatingRule.objects.filter(indicator=ind_obj).exists():
                for min_d, max_d, rating in DEFAULT_RATING_RULES:
                    RatingRule.objects.create(
                        indicator=ind_obj,
                        version=version_obj,
                        min_diff=min_d,
                        max_diff=max_d,
                        rating=rating,
                    )
                self.stdout.write(f"   ++ {ind_obj.name}: 5 rules created")
            else:
                self.stdout.write(f"   .. {ind_obj.name}: rules already exist, skipped")

        # 5. Clear existing data points if requested
        if options["clear"]:
            count = MacroDataPoint.objects.all().delete()[0]
            self.stdout.write(self.style.WARNING(f"\n[!]   Cleared {count} existing data points"))

        # 6. Parse & seed Excel data
        self.stdout.write("\n[>>]  Parsing Excel workbook...")
        wb = openpyxl.load_workbook(excel_path, data_only=True)

        def _bulk_upsert(records: list[dict], indicator_slug: str, status: str = "published"):
            """Bulk upsert MacroDataPoints, respecting published > manual priority."""
            indicator = indicator_objs[indicator_slug]
            n_created = 0
            n_updated = 0
            for rec in records:
                country = country_objs.get(rec["country_iso"])
                if not country:
                    continue
                existing = MacroDataPoint.objects.filter(
                    country=country,
                    indicator=indicator,
                    month=rec["month"],
                    is_active_value=True,
                ).first()

                if existing:
                    if existing.status == "manual" and status == "published":
                        # Published wins — demote old manual
                        existing.is_active_value = False
                        existing.save(update_fields=["is_active_value"])
                        MacroDataPoint.objects.create(
                            country=country,
                            indicator=indicator,
                            month=rec["month"],
                            value=rec["value"],
                            status=status,
                            source=rec.get("source", ""),
                            is_active_value=True,
                        )
                        n_created += 1
                    elif existing.status == status:
                        existing.value = rec["value"]
                        existing.source = rec.get("source", "")
                        existing.save(update_fields=["value", "source", "updated_at"])
                        n_updated += 1
                else:
                    MacroDataPoint.objects.create(
                        country=country,
                        indicator=indicator,
                        month=rec["month"],
                        value=rec["value"],
                        status=status,
                        source=rec.get("source", ""),
                        is_active_value=True,
                    )
                    n_created += 1

            return n_created, n_updated

        # GDP
        if "GDP data" in wb.sheetnames:
            self.stdout.write("   -> GDP data")
            records = parse_matrix_sheet(
                wb["GDP data"], EXCEL_COUNTRY_MAP, "TradingEconomics (seeded)"
            )
            c, u = _bulk_upsert(records, "gdp")
            self.stdout.write(f"      created={c}, updated={u}")

        # CPI
        if "CPI data" in wb.sheetnames:
            self.stdout.write("   -> CPI data")
            records = parse_matrix_sheet(
                wb["CPI data"], EXCEL_COUNTRY_MAP, "IMF (seeded)"
            )
            c, u = _bulk_upsert(records, "cpi")
            self.stdout.write(f"      created={c}, updated={u}")

        # FX Reserves
        if "FX RESERVE DATA" in wb.sheetnames:
            self.stdout.write("   -> FX Reserves")
            records = parse_matrix_sheet(
                wb["FX RESERVE DATA"], EXCEL_COUNTRY_MAP, "IMF SDMX (seeded)"
            )
            c, u = _bulk_upsert(records, "fx_reserves")
            self.stdout.write(f"      created={c}, updated={u}")

        # Interest Rates
        if "Interest Rates data" in wb.sheetnames:
            self.stdout.write("   -> Interest Rates")
            records = parse_interest_rates_sheet(
                wb["Interest Rates data"], EXCEL_COUNTRY_MAP
            )
            c, u = _bulk_upsert(records, "interest_rate")
            self.stdout.write(f"      created={c}, updated={u}")

        # Current Account / GDP
        if "CA GDP DATA" in wb.sheetnames:
            self.stdout.write("   -> Current Account / GDP")
            records = parse_matrix_sheet(
                wb["CA GDP DATA"], EXCEL_COUNTRY_MAP, "OECD SDMX (seeded)"
            )
            c, u = _bulk_upsert(records, "ca_gdp")
            self.stdout.write(f"      created={c}, updated={u}")

        # Equity — the EQUITY sheet has a more complex structure (pair-named rows)
        # We extract the % CHANGE rows per country ticker
        if "EQUITY" in wb.sheetnames:
            self.stdout.write("   -> Equity (% change from ATH)")
            equity_records = self._parse_equity_sheet(wb["EQUITY"], country_objs)
            c, u = _bulk_upsert(equity_records, "equity")
            self.stdout.write(f"      created={c}, updated={u}")

        # 7. Trigger full recalculation (outside atomic to avoid timeout)
        self.stdout.write("\n[**] Triggering full matrix recalculation...")
        try:
            from apps.macro.services.calculator import recalculate_full_matrix
            n = recalculate_full_matrix()
            self.stdout.write(self.style.SUCCESS(f"   [ok] {n} pair-months calculated"))
        except Exception as exc:
            self.stdout.write(self.style.WARNING(f"   [!] Recalculation error: {exc}"))

        self.stdout.write(self.style.SUCCESS("\n[DONE] Seed complete!\n"))

    def _parse_equity_sheet(self, ws, country_objs: dict) -> list[dict]:
        """
        The EQUITY sheet is structured as blocks per FX pair label, with:
          row: [pair_label, 'All time High (CL)', val, val, …]
          row: [None, 'current price', val, val, …]
          row: [None, '% CHANGE', formula, …]  ← we want this row but values are formulas

        Since the file is opened with data_only=True, formula cells should have cached values.
        We map known country equity tickers to our Country objects.
        """
        # Equity index → country ISO mapping (from EQUITY sheet row labels)
        EQUITY_PAIR_MAP = {
            "usd jpy": "JPY",    # Nikkei
            "eur usd": "EUR",    # STOXX50
            "gbp usd": "GBP",    # FTSE
            "aud usd": "AUD",    # ASX200
            "usd cad": "CAD",    # TSX
            "usd chf": "CHF",    # SMI
            "nzd usd": "NZD",    # NZX50
        }
        # The sheet also has explicit country mentions in later rows
        # For now extract % change rows where we can identify country
        rows = list(ws.iter_rows(values_only=True))
        records = []

        # Find date headers (appears once in row ~5)
        date_row = None
        dates = []
        for idx, row in enumerate(rows[:10]):
            date_candidates = [to_date(c) for c in row if to_date(c)]
            if len(date_candidates) >= 6:
                date_row = idx
                for col_idx, cell in enumerate(row):
                    d = to_date(cell)
                    if d:
                        dates.append((col_idx, d))
                break

        if not dates:
            return records

        current_iso = None
        for row in rows:
            label0 = str(row[0]).strip().lower() if row[0] else ""
            label1 = str(row[1]).strip().lower() if len(row) > 1 and row[1] else ""

            # Detect which country block we're in
            mapped = EQUITY_PAIR_MAP.get(label0)
            if mapped:
                current_iso = mapped

            # Grab the % change row
            if "% change" in label1 or "% change" in label0:
                if not current_iso:
                    continue
                for col_idx, month in dates:
                    if col_idx < len(row):
                        val = row[col_idx]
                        if isinstance(val, (int, float)):
                            records.append({
                                "country_iso": current_iso,
                                "month": month,
                                "value": round(float(val) * 100, 4),  # to percentage
                                "source": "yfinance (seeded)",
                            })

        return records
