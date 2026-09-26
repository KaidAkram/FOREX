"""
Management command: scrape_oecd_ca
Scrapes live Current Account (% of GDP) from the official OECD SDMX 3.0 API.
Specification matching OECD Data Explorer (https://data-explorer.oecd.org):
  - Dataset: Balance of Payments (OECD.SDD.TPS,DSD_BOP@DF_BOP,1.0)
  - Measure: Current Account (CA)
  - Unit of Measure: Percentage of GDP (PT_B1GQ)
  - Frequency: Quarterly (Q)
  - Accounting Entry: Balance (B)
  - Flow or Stock: Transactions (T)
  - Adjustment: Calendar & Seasonally Adjusted (Y)
  - Economies: G10 / Active Countries (AUS, CAN, CHE, EA20, GBR, JPN, NOR, NZL, SWE, USA)

Data Precision:
  - Unrounded raw float numbers (no ceiling, no flooring, no rounding).

Usage:
    python manage.py scrape_oecd_ca
    python manage.py scrape_oecd_ca --start-period 2023-Q1
    python manage.py scrape_oecd_ca --countries AUS,CAN,CHE,EA20,GBR,JPN,NZL,USA
"""
import urllib.request
import json
import socket
from datetime import date
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.macro.models import Country, MacroIndicator, MacroDataPoint
from apps.macro.services.calculator import recalculate_all_for_month

# Robust DNS resolution for sdmx.oecd.org (Cloudflare Anycast IPs)
_orig_getaddrinfo = socket.getaddrinfo

def _robust_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    if "oecd.org" in host:
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('104.18.0.146', port))]
    try:
        return _orig_getaddrinfo(host, port, family, type, proto, flags)
    except Exception:
        raise

socket.getaddrinfo = _robust_getaddrinfo


class Command(BaseCommand):
    help = "Scrapes live official OECD Current Account (% of GDP) via SDMX 3.0 API."

    def add_arguments(self, parser):
        parser.add_argument(
            "--start-period",
            type=str,
            default="2023-Q1",
            help="Starting quarterly period for observations (default: 2023-Q1)"
        )
        parser.add_argument(
            "--countries",
            type=str,
            default=None,
            help="Comma-separated OECD country codes (e.g. AUS,CAN,CHE,EA20,GBR,JPN,NZL,USA). Defaults to all active countries."
        )

    def handle(self, *args, **options):
        start_period = options["start_period"]
        countries_arg = options["countries"]

        self.stdout.write("=" * 65)
        self.stdout.write("LIVE OECD CURRENT ACCOUNT (% OF GDP) EXTRACTION ENGINE")
        self.stdout.write("   Dataset:   OECD.SDD.TPS,DSD_BOP@DF_BOP,1.0")
        self.stdout.write("   Indicator: Current Account / Balance (% of GDP)")
        self.stdout.write("   Unit:      Percentage of GDP (PT_B1GQ)")
        self.stdout.write("   Frequency: Quarterly (Q) -> Expanded to Monthly Reference Dates")
        self.stdout.write("   Precision: Full raw unrounded floats (no ceil, no floor)")
        self.stdout.write("=" * 65)

        # 1. Resolve Indicator
        indicator = MacroIndicator.objects.filter(slug="ca_gdp").first()
        if not indicator:
            raise CommandError("Indicator 'ca_gdp' does not exist in MacroIndicator table.")

        # 2. Resolve Countries
        if countries_arg:
            target_codes = [c.strip().upper() for c in countries_arg.split(",") if c.strip()]
            country_objs = list(Country.objects.filter(oecd_country_code__in=target_codes))
        else:
            country_objs = list(Country.objects.filter(is_active=True).exclude(oecd_country_code=""))

        if not country_objs:
            raise CommandError("No countries found with valid OECD country codes.")

        code_to_country = {c.oecd_country_code.upper(): c for c in country_objs}
        self.stdout.write(f"\n--> Fetching OECD SDMX data for {len(code_to_country)} economies: {list(code_to_country.keys())}...")

        all_records = []
        # Querying each country individually prevents OECD SDMX multi-series date truncation
        for oecd_code, country_obj in code_to_country.items():
            url = f"https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS,DSD_BOP@DF_BOP,1.0/{oecd_code}..CA...Q.PT_B1GQ.Y?startPeriod={start_period}"
            req = urllib.request.Request(url, headers={
                "Accept": "application/vnd.sdmx.data+json;version=1.0.0-wd, application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            try:
                with urllib.request.urlopen(req, timeout=25) as resp:
                    raw_json = json.loads(resp.read().decode("utf-8"))
            except Exception as exc:
                self.stdout.write(self.style.WARNING(f"   [!] Failed to fetch {oecd_code}: {exc}"))
                continue

            structure = raw_json.get("data", {}).get("structure", {})
            obs_dims = structure.get("dimensions", {}).get("observation", [])
            if not obs_dims:
                self.stdout.write(self.style.WARNING(f"   [!] No observation dimension for {oecd_code}"))
                continue

            time_periods = [v["id"] for v in obs_dims[0].get("values", [])]
            datasets = raw_json.get("data", {}).get("dataSets", [])
            if not datasets:
                continue

            series_dict = datasets[0].get("series", {})
            country_points = 0
            for s_key, s_val in series_dict.items():
                obs = s_val.get("observations", {})
                for tidx_str, oval in obs.items():
                    quarter_str = time_periods[int(tidx_str)] # "2023-Q1"
                    raw_val = oval[0]
                    if raw_val is None:
                        continue
                    
                    val_float = float(raw_val) # Full precision, exact number
                    
                    # Parse Quarter YYYY-Q#
                    try:
                        yr, q_part = quarter_str.split("-Q")
                        year = int(yr)
                        q_num = int(q_part)
                    except Exception:
                        continue

                    # Each quarter maps to the 3 constituent months (day=1)
                    # Q1: 01, 02, 03; Q2: 04, 05, 06; Q3: 07, 08, 09; Q4: 10, 11, 12
                    base_month = (q_num - 1) * 3 + 1
                    for offset in range(3):
                        m_date = date(year, base_month + offset, 1)
                        all_records.append({
                            "country": country_obj,
                            "month": m_date,
                            "value": val_float,
                            "quarter": quarter_str
                        })
                    country_points += 1

            self.stdout.write(f"   [+] Loaded {oecd_code} ({country_obj.name}): {country_points} quarters")

        if not all_records:
            self.stdout.write(self.style.ERROR("\n[!] No records extracted from OECD."))
            return

        self.stdout.write(f"\n--> Upserting {len(all_records)} monthly datapoints into database...")
        created_count = 0
        updated_count = 0

        # Temporarily disconnect post_save signal to prevent 330 redundant recalculations
        from django.db.models.signals import post_save
        from apps.macro.signals import on_macro_data_change
        post_save.disconnect(on_macro_data_change, sender="macro.MacroDataPoint")

        try:
            with transaction.atomic():
                for rec in all_records:
                    obj, created = MacroDataPoint.objects.update_or_create(
                        country=rec["country"],
                        indicator=indicator,
                        month=rec["month"],
                        is_active_value=True,
                        defaults={
                            "value": rec["value"],
                            "status": MacroDataPoint.Status.PUBLISHED,
                            "source": f"OECD SDMX 3.0 API ({rec['quarter']})",
                            "notes": "OECD BOP DSD_BOP@DF_BOP PT_B1GQ unrounded float"
                        }
                    )
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1
        finally:
            post_save.connect(on_macro_data_change, sender="macro.MacroDataPoint")

        self.stdout.write(self.style.SUCCESS(f"   -> Created: {created_count}, Updated: {updated_count} datapoints"))

        # Recalculate macro matrix once cleanly
        self.stdout.write(f"\n--> Recalculating Full Macro Differentials, Ratings & Bias...")
        from apps.macro.services.calculator import recalculate_full_matrix
        total_pair_months = recalculate_full_matrix()

        self.stdout.write(self.style.SUCCESS(f"   -> [ok] {total_pair_months} pair-month calculations updated."))
        self.stdout.write(self.style.SUCCESS("\n[DONE] Live OECD Current Account Ingestion Complete!\n"))
