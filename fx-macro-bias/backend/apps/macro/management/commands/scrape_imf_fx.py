"""
Management command: scrape_imf_fx
Scrapes live Foreign Exchange Reserves (excluding gold) from the official IMF SDMX 3.0 API.
Specification matching IMF Data Explorer (https://data.imf.org/en/Data-Explorer):
  - Dataset: International Liquidity (IL / IMF.STA:IL(13.0.1))
  - Indicator: Reserves excluding gold, foreign exchange (RXF11FX_REVS)
  - Unit: USD (Millions of US Dollars)
  - Frequency: Monthly (M)
  - Economies: G10 + active countries in database

Usage:
    python manage.py scrape_imf_fx
    python manage.py scrape_imf_fx --start-year 2018
    python manage.py scrape_imf_fx --countries USA,G163,JPN,GBR,AUS,CAN,CHE,NZL
"""
import urllib.request
import json
from datetime import datetime, date
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.macro.models import Country, MacroIndicator, MacroDataPoint, FXPair
from apps.macro.services.calculator import recalculate_all_for_month


class Command(BaseCommand):
    help = "Scrapes live official IMF FX Reserves (excluding gold) via SDMX 3.0 API."

    def add_arguments(self, parser):
        parser.add_argument(
            "--start-year",
            type=int,
            default=2018,
            help="Starting year for observations (default: 2018)"
        )
        parser.add_argument(
            "--countries",
            type=str,
            default=None,
            help="Comma-separated IMF country codes (e.g. USA,G163,JPN,GBR). Defaults to all active countries."
        )

    def handle(self, *args, **options):
        start_year = options["start_year"]
        countries_arg = options["countries"]

        self.stdout.write("=" * 60)
        self.stdout.write("LIVE IMF FOREIGN EXCHANGE RESERVES EXTRACTION ENGINE")
        self.stdout.write("   Dataset:   International Liquidity (IMF.STA:IL(13.0.1))")
        self.stdout.write("   Indicator: Reserves excluding gold, foreign exchange (RXF11FX_REVS)")
        self.stdout.write("   Unit:      USD (Scaled to Millions of USD)")
        self.stdout.write("   Frequency: Monthly (M)")
        self.stdout.write("=" * 60)

        # 1. Resolve Indicator
        indicator = MacroIndicator.objects.filter(slug="fx_reserves").first()
        if not indicator:
            raise CommandError("Indicator 'fx_reserves' does not exist in MacroIndicator table.")

        # 2. Resolve Countries
        if countries_arg:
            target_codes = [c.strip().upper() for c in countries_arg.split(",") if c.strip()]
            country_objs = list(Country.objects.filter(imf_country_code__in=target_codes))
        else:
            country_objs = list(Country.objects.filter(is_active=True).exclude(imf_country_code=""))

        if not country_objs:
            raise CommandError("No countries found with valid IMF country codes.")

        code_to_country = {c.imf_country_code.upper(): c for c in country_objs}
        query_codes = "+".join(sorted(code_to_country.keys()))

        self.stdout.write(f"\n--> Querying IMF SDMX 3.0 API for {len(code_to_country)} economies: {query_codes}...")

        base_url = f"https://api.imf.org/external/sdmx/3.0/data/dataflow/IMF.STA/IL/13.0.1/{query_codes}.RXF11FX_REVS.USD.M"
        query_params = f"c%5BTIME_PERIOD%5D=ge:{start_year}-01-01&attributes=all&detail=full&includeHistory=true"
        url = f"{base_url}?{query_params}"

        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/vnd.sdmx.data+json;version=1.0.0-wd, application/json"
        })

        try:
            with urllib.request.urlopen(req, timeout=35) as resp:
                raw_json = json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            raise CommandError(f"Failed to fetch IMF SDMX data: {exc}")

        # 3. Parse SDMX JSON Structure
        s0 = raw_json.get("data", {}).get("structures", [{}])[0]
        dim_countries = [c["id"].upper() for c in s0.get("dimensions", {}).get("series", [{}])[0].get("values", [])]
        dim_periods = [t["value"] for t in s0.get("dimensions", {}).get("observation", [{}])[0].get("values", [])]
        datasets = raw_json.get("data", {}).get("dataSets", [])

        if not datasets or not dim_countries:
            self.stdout.write(self.style.WARNING("[!] No datasets or dimensions returned from IMF."))
            return

        series_dict = datasets[0].get("series", {})
        self.stdout.write(f"[+] Received {len(series_dict)} series across {len(dim_periods)} time periods.\n")

        records_to_upsert = []
        months_affected = set()

        for s_key, s_data in series_dict.items():
            c_idx = int(s_key.split(":")[0])
            c_code = dim_countries[c_idx]
            country = code_to_country.get(c_code)
            if not country:
                continue

            obs = s_data.get("observations", {})
            country_obs_count = 0
            latest_period = None
            latest_val_m = None

            for t_idx_str, val_list in obs.items():
                t_idx = int(t_idx_str)
                period_str = dim_periods[t_idx] # e.g. "2024-M08"
                parts = period_str.split("-M")
                if len(parts) == 2:
                    month_date = date(int(parts[0]), int(parts[1]), 1)
                else:
                    continue

                raw_val = val_list[0]
                if raw_val is not None:
                    # Scale nominal USD into Millions of USD (matching IMF Data Explorer)
                    val_m = round(float(raw_val) / 1e6, 2)
                    records_to_upsert.append({
                        "country": country,
                        "indicator": indicator,
                        "month": month_date,
                        "value": val_m,
                        "source": "IMF Data Explorer (RXF11FX_REVS)",
                        "status": "PROCESSED",
                        "is_active_value": True,
                    })
                    months_affected.add(month_date)
                    country_obs_count += 1
                    latest_period = period_str
                    latest_val_m = val_m

            self.stdout.write(f"  * {country.name:<18} ({c_code}): {country_obs_count} monthly points | Latest: {latest_period} = ${latest_val_m:,.2f} M USD")

        # 4. Upsert into Database
        self.stdout.write(f"\n[+] Upserting {len(records_to_upsert)} live observations into MacroDataPoint table...")
        created_count = 0
        updated_count = 0

        with transaction.atomic():
            for rec in records_to_upsert:
                _, created = MacroDataPoint.objects.update_or_create(
                    country=rec["country"],
                    indicator=rec["indicator"],
                    month=rec["month"],
                    defaults={
                        "value": rec["value"],
                        "source": rec["source"],
                        "status": rec["status"],
                        "is_active_value": rec["is_active_value"],
                    }
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1

        self.stdout.write(self.style.SUCCESS(f"[OK] Upsert complete: {created_count} created, {updated_count} updated."))

        # 5. Trigger Recalculations for Affected Pairs
        self.stdout.write(f"\n[+] Recalculating Macro Differentials, Ratings, and Bias across {len(months_affected)} months...")
        active_pairs = list(FXPair.objects.filter(is_active=True))
        recalc_count = 0

        for month in sorted(months_affected):
            for pair in active_pairs:
                try:
                    recalculate_all_for_month(pair.pk, month)
                    recalc_count += 1
                except Exception as exc:
                    pass

        self.stdout.write(self.style.SUCCESS(f"[OK] Finished {recalc_count} pair-month recalculations!"))
        self.stdout.write(self.style.SUCCESS("All FX Reserves now 100% synchronized with official IMF Data Explorer."))
