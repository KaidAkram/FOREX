import os
import sys
import pandas as pd

# Import functions from For Win/wari_scraper_app.py
sys.path.insert(0, os.path.abspath(r"Houari_project copie/Houari_project copie/For Win"))
from wari_scraper_app import (
    INDICATORS, OECD_COUNTRY_MAP, IMF_COUNTRY_MAP,
    rate_current_account, compute_post_scraping_math
)
import urllib.request
import json

test_countries = [
    "australia", "canada", "switzerland", "euro-area",
    "united-kingdom", "japan", "new-zealand", "united-states"
]

print("1. Verifying OECD SDMX API Data Fetching for All 8 Core Forex Economies...")
ca_monthly_records = []
ca_quarterly_records = []

for c in test_countries:
    code = OECD_COUNTRY_MAP[c]
    display_name = c.replace("-", " ").title()
    url = f"https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS,DSD_BOP@DF_BOP,1.0/{code}..CA...Q.PT_B1GQ.Y?startPeriod=2023-Q1"
    req = urllib.request.Request(url, headers={
        "Accept": "application/vnd.sdmx.data+json;version=1.0.0-wd, application/json",
        "User-Agent": "Mozilla/5.0"
    })
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw_json = json.loads(resp.read().decode("utf-8"))
    
    structure = raw_json["data"]["structure"]
    time_periods = [v["id"] for v in structure["dimensions"]["observation"][0]["values"]]
    series = raw_json["data"]["dataSets"][0].get("series", {})
    obs_count = 0
    for s_key, s_val in series.items():
        obs = s_val.get("observations", {})
        for tidx_str, oval in obs.items():
            quarter_str = time_periods[int(tidx_str)]
            raw_val = oval[0]
            if raw_val is not None:
                val_float = float(raw_val) # Full precision unrounded float
                ca_quarterly_records.append({
                    "Country": display_name,
                    "Code": code,
                    "Quarter": quarter_str,
                    "Value": val_float
                })
                yr, q_part = quarter_str.split("-Q")
                base_m = (int(q_part) - 1) * 3 + 1
                for mo_offset in range(3):
                    m_str = f"{yr}-{str(base_m + mo_offset).zfill(2)}-01"
                    ca_monthly_records.append({
                        "Country": display_name,
                        "Timeframe": m_str,
                        "Value": val_float
                    })
                obs_count += 1
    print(f"   [OK] {display_name} ({code}): {obs_count} quarters retrieved")

q_df = pd.DataFrame(ca_quarterly_records)
q_pivot = q_df.pivot(index='Code', columns='Quarter', values='Value')
quarters_sorted = sorted(q_pivot.columns, key=lambda q: (int(q.split('-Q')[0]), int(q.split('-Q')[1])))
q_pivot = q_pivot[quarters_sorted]

print("\n--- 2. Pivoted Quarterly Data (Raw Float Numbers, NO Ceil/Floor/Rounding) ---")
print(q_pivot.to_string())

print("\n--- 3. Pivoted Data Rounded to 2 Decimals (Cross-Check with Client's Notebook Screenshot) ---")
print(q_pivot.round(2).to_string())

# Cross check known values from client's notebook:
# AUS 2024-Q1 = -1.32, 2026-Q1 = -3.45, 2026-Q2 = -3.67
# CAN 2024-Q1 = -0.77, 2026-Q1 = -1.00, 2026-Q2 = 1.03
# CHE 2024-Q1 = 11.87, 2026-Q1 = 10.02, 2026-Q2 = 9.20
# USA 2024-Q1 = -3.61, 2026-Q1 = -2.67, 2026-Q2 = -3.03
client_benchmark = {
    ("AUS", "2024-Q1"): -1.32,
    ("AUS", "2026-Q2"): -3.67,
    ("CAN", "2024-Q1"): -0.77,
    ("CAN", "2026-Q2"): 1.03,
    ("CHE", "2024-Q1"): 11.87,
    ("CHE", "2026-Q2"): 9.20,
    ("USA", "2024-Q1"): -3.61,
    ("USA", "2026-Q2"): -3.03,
    ("JPN", "2024-Q1"): 4.32,
    ("JPN", "2026-Q2"): 5.03,
    ("NZL", "2024-Q1"): -5.37,
    ("NZL", "2026-Q2"): -3.26,
}

print("\n--- 4. Benchmarking Against Client's Jupyter Notebook Output ---")
all_matched = True
for (code, qtr), expected in client_benchmark.items():
    actual_rounded = round(q_pivot.loc[code, qtr], 2)
    actual_raw = q_pivot.loc[code, qtr]
    if actual_rounded == expected:
        print(f"   [MATCH] {code} {qtr}: raw={actual_raw} -> round(2)={actual_rounded} == expected {expected}")
    else:
        print(f"   [MISMATCH] {code} {qtr}: actual={actual_rounded} != expected {expected}")
        all_matched = False

if all_matched:
    print("\n>>> 100% PERFECT MATCH WITH CLIENT'S AND OECD PORTAL DATA! <<<")
