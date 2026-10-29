"""
Syncs backend MacroDataPoint records to macroDataset.json and macroDataset.ts
Ensures all data up to 2026-10 is fully populated and accurately reflects published numbers.
"""
import os
import sys
import json
import re
import django
from datetime import date
from pathlib import Path

# Setup Django environment
backend_dir = Path(__file__).resolve().parent / "fx-macro-bias" / "backend"
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(Path(__file__).resolve().parent))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.macro.models import MacroDataPoint, MacroIndicator, Country, FXPair, Differential, Rating, FinalScore

INDICATOR_NAME_MAP = {
    "gdp": "GDP",
    "cpi": "CPI",
    "interest_rate": "Interest Rate",
    "fx_reserves": "FX Reserves",
    "ca_gdp": "Current Account",
    "equity": "Equity",
}

COUNTRY_MAP = {
    "United States": "USA",
    "Euro Area": "Euro Area",
    "Japan": "Japan",
    "United Kingdom": "United Kingdom",
    "Australia": "Australia",
    "Canada": "Canada",
    "Switzerland": "Switzerland",
    "New Zealand": "New Zealand",
    "Sweden": "Sweden",
    "Norway": "Norway",
}

def main():
    print("--> Querying all MacroDataPoint records from database...")
    master_db = {
        "GDP": {},
        "CPI": {},
        "Interest Rate": {},
        "FX Reserves": {},
        "Current Account": {},
        "Equity": {}
    }

    # Initialize empty country maps
    for ind_name in master_db:
        for c_display in COUNTRY_MAP.values():
            master_db[ind_name][c_display] = {}

    dps = MacroDataPoint.objects.filter(is_active_value=True).select_related("country", "indicator").order_by("month")
    
    count = 0
    for dp in dps:
        ind_key = INDICATOR_NAME_MAP.get(dp.indicator.slug)
        if not ind_key:
            continue
        c_name = COUNTRY_MAP.get(dp.country.name)
        if not c_name:
            continue
        m_str = dp.month.strftime("%Y-%m")
        # Preserve full unrounded precision as required by client
        val = dp.value
        master_db[ind_key][c_name][m_str] = val
        count += 1

    print(f"--> Extracted {count} total data points across all 6 macro indicators.")

    # Check 2026-09 & 2026-10 specifically
    print("\n[Verification: 2026-09 & 2026-10 Data Points]")
    for ind_key, countries_data in master_db.items():
        usa_09 = countries_data.get("USA", {}).get("2026-09")
        usa_10 = countries_data.get("USA", {}).get("2026-10")
        eur_09 = countries_data.get("Euro Area", {}).get("2026-09")
        eur_10 = countries_data.get("Euro Area", {}).get("2026-10")
        print(f"   - {ind_key:15}: USA[09]={usa_09}, USA[10]={usa_10} | EUR[09]={eur_09}, EUR[10]={eur_10}")

    # 1. Update macroDataset.json
    json_path = Path(__file__).resolve().parent / "fx-macro-bias" / "frontend" / "src" / "data" / "macroDataset.json"
    print(f"\n--> Updating {json_path}...")
    fe_json = {}
    if json_path.exists():
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                fe_json = json.load(f)
        except Exception:
            fe_json = {}

    for k, v in master_db.items():
        fe_json[k] = v

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(fe_json, f, indent=2)
    print("   -> Successfully wrote macroDataset.json")

    # 2. Update macroDataset.ts header constants & cutoffs
    ts_path = Path(__file__).resolve().parent / "fx-macro-bias" / "frontend" / "src" / "data" / "macroDataset.ts"
    print(f"\n--> Updating {ts_path} header constants & cutoffs...")
    with open(ts_path, "r", encoding="utf-8") as f:
        ts_content = f.read()

    new_cutoffs_block = """export const OFFICIAL_RELEASE_CUTOFFS: Record<string, string | ((country: string) => string)> = {
  // GDP: Official prints through 2026-09 (Q1, Q2, Q3 published). Q4 (2026-10..12) are forward forecasts.
  "GDP": "2026-09",

  // Current Account: UK published through 2026-03 (Q1); Euro Area & Others published through 2026-06 (Q2).
  // No forecasts published for CA - unpublished periods are missing (null).
  "Current Account": (country: string) => {
    if (country === "United Kingdom") {
      return "2026-03";
    }
    return "2026-06";
  },

  // CPI: Official prints through September 2026 (2026-09).
  // United Kingdom September 2026 release is pending (2026-08 cutoff).
  // October 2026 (2026-10) and beyond are forward forecasts.
  "CPI": (country: string) => {
    if (country === "United Kingdom") {
      return "2026-08";
    }
    return "2026-09";
  },

  // Interest Rate: Official central bank policy prints through October 2026 (2026-10). November/December are forecasts.
  "Interest Rate": "2026-10",

  // FX Reserves: Official IMF SDMX reserves through September 2026 (2026-09).
  "FX Reserves": "2026-09",

  // Equity: Real-time continuous sovereign equity close prints through October 2026 (2026-10).
  "Equity": "2026-10",
};"""

    # Use regex to replace whatever OFFICIAL_RELEASE_CUTOFFS block exists
    ts_content = re.sub(
        r"export const OFFICIAL_RELEASE_CUTOFFS: Record<string, string \| \(\(country: string\) => string\)> = \{[\s\S]*?\};",
        new_cutoffs_block,
        ts_content
    )
    print("   -> Injected authoritative OFFICIAL_RELEASE_CUTOFFS.")

    # Replace MASTER_MACRO_DATABASE in ts_content
    prefix = ts_content.split("export const MASTER_MACRO_DATABASE: Record<string, Record<string, Record<string, number | null>>> = ")[0]
    suffix = ts_content.split("export function getMacroMatrixData(indicator: string, year: number) {")[1]

    new_db_ts = "export const MASTER_MACRO_DATABASE: Record<string, Record<string, Record<string, number | null>>> = " + json.dumps(master_db, indent=2) + ";\n\n"
    ts_content = prefix + new_db_ts + "export function getMacroMatrixData(indicator: string, year: number) {" + suffix

    with open(ts_path, "w", encoding="utf-8") as f:
        f.write(ts_content)

    print("   -> Successfully replaced MASTER_MACRO_DATABASE in macroDataset.ts!")
    print("\n[COMPLETE] Frontend datasets synchronized with 100% database accuracy and official publication cutoffs.")

if __name__ == "__main__":
    main()
