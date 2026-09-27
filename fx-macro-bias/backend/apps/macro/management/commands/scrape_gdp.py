"""
Management command: scrape_gdp
Scrapes live GDP Annual Growth Rate from TradingEconomics (https://tradingeconomics.com/country/gdp-growth-annual).
Specification matching official TradingEconomics Annual GDP Growth:
  - Source: National Statistics Bureaus via TradingEconomics
  - Indicator: GDP Annual Growth Rate (%)
  - Measure: Year-on-Year Growth Rate (% YoY)
  - Frequency: Quarterly (Q) -> Expanded to Monthly Reference Dates
  - Precision: Full unrounded raw float numbers (no ceiling, no flooring, no rounding)
  - Economies: G10 / Active Countries (United States, Euro Area, Japan, United Kingdom,
               Australia, Canada, Switzerland, New Zealand, Sweden, Norway)

Usage:
    python manage.py scrape_gdp
    python manage.py scrape_gdp --start-year 2023
    python manage.py scrape_gdp --countries USD,EUR,GBP,JPY,CAD,AUD,CHF,NZD
"""
import urllib.request
import urllib.parse
import base64
import gzip
import json
import re
from datetime import date, datetime, timezone
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.macro.models import Country, MacroIndicator, MacroDataPoint, FXPair
from apps.macro.services.calculator import recalculate_all_for_month

TE_OBFUSCATION_KEY = "tradingeconomics-charts-core-api-key"

COUNTRY_SLUG_OVERRIDE = {
    "USD": "united-states",
    "EUR": "euro-area",
    "JPY": "japan",
    "GBP": "united-kingdom",
    "AUD": "australia",
    "CAD": "canada",
    "CHF": "switzerland",
    "NZD": "new-zealand",
    "SEK": "sweden",
    "NOK": "norway",
}


class Command(BaseCommand):
    help = "Scrapes live official GDP Annual Growth Rate from TradingEconomics."

    def add_arguments(self, parser):
        parser.add_argument(
            "--start-year",
            type=int,
            default=2023,
            help="Starting year for observations to store (default: 2023)"
        )
        parser.add_argument(
            "--countries",
            type=str,
            default=None,
            help="Comma-separated country ISO codes (e.g. USD,EUR,GBP,JPY,CAD,AUD,CHF,NZD). Defaults to all active countries."
        )
        parser.add_argument(
            "--span",
            type=str,
            default="10y",
            help="Time span to fetch from TradingEconomics (default: 10y)"
        )

    def handle(self, *args, **options):
        start_year = options["start_year"]
        countries_arg = options["countries"]
        span = options["span"]

        self.stdout.write("=" * 70)
        self.stdout.write("LIVE TRADINGECONOMICS GDP ANNUAL GROWTH RATE SCRAPING ENGINE")
        self.stdout.write("   Indicator: GDP Annual Growth Rate (%)")
        self.stdout.write("   Unit:      Percent (% YoY)")
        self.stdout.write("   Frequency: Quarterly (Q) -> Expanded to Monthly Reference Dates")
        self.stdout.write("   Precision: Full raw unrounded floats (no ceil, no floor)")
        self.stdout.write("=" * 70)

        # 1. Resolve Indicator
        indicator = MacroIndicator.objects.filter(slug="gdp").first()
        if not indicator:
            raise CommandError("Indicator with slug 'gdp' does not exist in MacroIndicator table.")

        # 2. Resolve Countries
        if countries_arg:
            target_isos = [c.strip().upper() for c in countries_arg.split(",") if c.strip()]
            country_objs = list(Country.objects.filter(iso_code__in=target_isos))
        else:
            country_objs = list(Country.objects.filter(is_active=True))

        if not country_objs:
            raise CommandError("No active countries found.")

        self.stdout.write(f"\n--> Fetching GDP data for {len(country_objs)} economies: {[c.iso_code for c in country_objs]}...")

        all_records = []

        for country in country_objs:
            slug = COUNTRY_SLUG_OVERRIDE.get(country.iso_code.upper(), country.trading_economics_slug)
            if not slug:
                self.stdout.write(self.style.WARNING(f"   [SKIP] No slug for {country.name} ({country.iso_code})"))
                continue

            page_url = f"https://tradingeconomics.com/{slug}/gdp-growth-annual"
            self.stdout.write(f"\n--> [{country.iso_code}] Querying {page_url}...")

            try:
                req_page = urllib.request.Request(page_url, headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9"
                })
                with urllib.request.urlopen(req_page, timeout=15) as resp:
                    html = resp.read().decode("utf-8")

                token_match = re.search(r"TEChartsToken\s*=\s*'([^']+)'", html)
                token = token_match.group(1) if token_match else "20260324:loboantunes"

                symbol_match = re.search(r"TESymbol\s*=\s*'([^']+)'", html)
                symbol = symbol_match.group(1) if symbol_match else None

                forecast_match = re.search(r"TEForecast\s*=\s*(\[[^\]]+\])", html)
                forecasts = json.loads(forecast_match.group(1)) if forecast_match else []

                if not symbol:
                    self.stdout.write(self.style.ERROR(f"   [ERROR] Could not extract TESymbol for {country.name}"))
                    continue

                sym_encoded = urllib.parse.quote(symbol.lower())
                data_url = f"https://d3ii0wo49og5mi.cloudfront.net/economics/{sym_encoded}?span={span}"
                req_data = urllib.request.Request(data_url, headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "x-api-key": token,
                    "Referer": page_url
                })
                with urllib.request.urlopen(req_data, timeout=15) as resp_data:
                    raw_str = json.loads(resp_data.read().decode("utf-8"))

                # Decrypt XOR and decompress gzip
                enc_bytes = base64.b64decode(raw_str)
                key_bytes = TE_OBFUSCATION_KEY.encode("utf-8")
                dec_bytes = bytearray(b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(enc_bytes))
                decompressed = gzip.decompress(dec_bytes)
                json_data = json.loads(decompressed.decode("utf-8"))

                series = json_data[0]["series"][0]["serie"]
                raw_data = series.get("data", [])
                self.stdout.write(f"   [OK] Retrieved {len(raw_data)} data points for {country.name} ({symbol})")

                # Map quarterly points: [val, ts, _, 'YYYY-MM-01']
                quarterly_map = {}
                for pt in raw_data:
                    val = float(pt[0])
                    dt_str = pt[3]
                    yr = int(dt_str[:4])
                    mo = int(dt_str[5:7])
                    quarterly_map[(yr, mo)] = val

                # Expand to monthly reference dates from start_year to current live year (2026)
                current_year = 2026
                country_records = 0

                for y in range(start_year, current_year + 1):
                    # Q1 -> months 1, 2, 3
                    # Q2 -> months 4, 5, 6
                    # Q3 -> months 7, 8, 9
                    # Q4 -> months 10, 11, 12
                    quarters_def = [
                        (3, [1, 2, 3]),
                        (6, [4, 5, 6]),
                        (9, [7, 8, 9]),
                        (12, [10, 11, 12]),
                    ]

                    for q_mo, sub_months in quarters_def:
                        val = quarterly_map.get((y, q_mo))

                        # If not published yet (e.g. Q3/Q4 2026), use the forecast if available
                        if val is None:
                            if y == 2026 and q_mo == 9 and len(forecasts) > 0:
                                val = float(forecasts[0])
                            elif y == 2026 and q_mo == 12 and len(forecasts) > 1:
                                val = float(forecasts[1])

                        if val is not None:
                            for m in sub_months:
                                ref_date = date(y, m, 1)
                                dt_pub = datetime(y, m, 1, 0, 0, 0, tzinfo=timezone.utc)
                                all_records.append({
                                    "country": country,
                                    "indicator": indicator,
                                    "month": ref_date,
                                    "value": val,
                                    "source": "TradingEconomics Official Release",
                                    "period_type": "quarterly_expanded",
                                    "status": "published",
                                    "published_at": dt_pub
                                })
                                country_records += 1

                self.stdout.write(f"   -> Expanded {country_records} monthly observations ({start_year} - {current_year})")

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"   [ERROR] Failed to fetch {country.name}: {e}"))

        if not all_records:
            raise CommandError("No records were successfully extracted from TradingEconomics.")

        self.stdout.write(f"\n--> Upserting {len(all_records)} total MacroDataPoints into database...")
        upserted_count = 0
        affected_months = set()

        with transaction.atomic():
            for rec in all_records:
                MacroDataPoint.objects.update_or_create(
                    country=rec["country"],
                    indicator=rec["indicator"],
                    month=rec["month"],
                    defaults={
                        "value": rec["value"],
                        "status": rec["status"],
                        "source": rec["source"],
                        "period_type": rec["period_type"],
                        "published_at": rec["published_at"],
                        "is_active_value": True
                    }
                )
                upserted_count += 1
                affected_months.add(rec["month"])

        self.stdout.write(self.style.SUCCESS(f"[SUCCESS] Successfully upserted {upserted_count} GDP MacroDataPoints!"))

        # 3. Recalculate pipeline for all active FX pairs and affected months inside transaction
        self.stdout.write(f"\n--> Triggering bias engine recalculation across {len(affected_months)} months...")
        active_pairs = list(FXPair.objects.filter(is_active=True))
        total_recalculated = 0

        with transaction.atomic():
            for pair in active_pairs:
                for m in sorted(affected_months):
                    try:
                        recalculate_all_for_month(pair.id, m)
                        total_recalculated += 1
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f"   Recalc error for {pair} at {m}: {e}"))

        self.stdout.write(self.style.SUCCESS(f"[SUCCESS] Recalculated {total_recalculated} pair-month final scores successfully!"))
        self.stdout.write("=" * 70)
