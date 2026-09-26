import os
import sys
import pandas as pd
import openpyxl
import json
import urllib.request
import socket

# Robust DNS
_orig_getaddrinfo = socket.getaddrinfo
def _robust_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    if "oecd.org" in host:
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('104.18.0.146', port))]
    return _orig_getaddrinfo(host, port, family, type, proto, flags)
socket.getaddrinfo = _robust_getaddrinfo

# Import functions from For Win/wari_scraper_app.py
sys.path.insert(0, os.path.abspath(r"Houari_project copie/Houari_project copie/For Win"))
from wari_scraper_app import OECD_COUNTRY_MAP

test_countries = [
    "australia", "canada", "switzerland", "euro-area",
    "united-kingdom", "japan", "new-zealand", "united-states"
]

print("=" * 80)
print("1. VERIFYING LIVE OECD SDMX 3.0 API EXTRACTIONS (NO ROUNDING / CEIL / FLOOR)")
print("=" * 80)
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
                val_float = float(raw_val)
                ca_quarterly_records.append({
                    "Country": display_name,
                    "Code": code,
                    "Quarter": quarter_str,
                    "Value": val_float
                })
                obs_count += 1
    print(f"   [OK] {display_name} ({code}): {obs_count} quarters retrieved")

q_df = pd.DataFrame(ca_quarterly_records)
q_pivot = q_df.pivot(index='Code', columns='Quarter', values='Value')
quarters_sorted = sorted(q_pivot.columns, key=lambda q: (int(q.split('-Q')[0]), int(q.split('-Q')[1])))
q_pivot = q_pivot[quarters_sorted]

print("\n--- 2. US DATA BENCHMARK FROM USER'S OECD DATA EXPLORER SCREENSHOT ---")
user_screenshot_usa = {
    "2025-Q2": -3.344384,
    "2025-Q3": -3.381205,
    "2025-Q4": -2.814096,
    "2026-Q1": -2.668661,
    "2026-Q2": -3.029274,
}

all_match_api = True
for qtr, expected in user_screenshot_usa.items():
    actual = q_pivot.loc["USA", qtr]
    if abs(actual - expected) < 1e-6:
        print(f"   [PERFECT MATCH] USA {qtr}: Live API = {actual} == User Screenshot = {expected}")
    else:
        print(f"   [MISMATCH] USA {qtr}: Live API = {actual} != User Screenshot = {expected}")
        all_match_api = False

print("\n=" * 80)
print("3. VERIFYING EXCEL8EXAMPLE.xlsx (CA GDP DATA & CA GDP (Quarterly) SHEETS)")
print("=" * 80)
wb = openpyxl.load_workbook("EXCEL8EXAMPLE.xlsx", data_only=True)

# Test 1: CA GDP DATA sheet
ws_ca = wb["CA GDP DATA"]
print("--> Checking 'CA GDP DATA' Sheet (USA Row 9):")
month_cols_to_check = {
    "2025-04 (2025-Q2)": (29, -3.344384),
    "2025-07 (2025-Q3)": (32, -3.381205),
    "2025-10 (2025-Q4)": (35, -2.814096),
    "2026-01 (2026-Q1)": (38, -2.668661),
    "2026-04 (2026-Q2)": (41, -3.029274),
}

all_match_excel = True
for label, (col_idx, expected) in month_cols_to_check.items():
    actual = ws_ca.cell(9, col_idx).value
    if actual is not None and abs(actual - expected) < 1e-6:
        print(f"   [PERFECT MATCH] Col {col_idx} {label}: Excel = {actual} == Expected = {expected}")
    else:
        print(f"   [MISMATCH] Col {col_idx} {label}: Excel = {actual} != Expected = {expected}")
        all_match_excel = False

# Test 2: CA GDP (Quarterly) sheet
ws_q = wb["CA GDP (Quarterly)"]
print("\n--> Checking 'CA GDP (Quarterly)' Sheet Benchmark Table:")
for r in range(17, 22):
    qtr = ws_q.cell(r, 1).value
    val = ws_q.cell(r, 2).value
    expected = user_screenshot_usa.get(qtr)
    if val is not None and abs(val - expected) < 1e-6:
        print(f"   [PERFECT MATCH] Row {r} {qtr}: Excel = {val} == Expected = {expected}")
    else:
        print(f"   [MISMATCH] Row {r} {qtr}: Excel = {val} != Expected = {expected}")
        all_match_excel = False

print("\n=" * 80)
print("4. VERIFYING FRONTEND DATASET (macroDataset.ts)")
print("=" * 80)
with open("fx-macro-bias/frontend/src/data/macroDataset.ts", "r", encoding="utf-8") as f:
    ts_code = f.read()

fe_months = {
    "2025-04": -3.344384,
    "2025-07": -3.381205,
    "2025-10": -2.814096,
    "2026-01": -2.668661,
    "2026-04": -3.029274,
}

all_match_fe = True
for m, expected in fe_months.items():
    pattern = f'"{m}": {expected}'
    if pattern in ts_code:
        print(f"   [PERFECT MATCH] macroDataset.ts -> USA '{m}': {expected}")
    else:
        print(f"   [MISMATCH] macroDataset.ts -> missing '{m}': {expected}")
        all_match_fe = False

if all_match_api and all_match_excel and all_match_fe:
    print("\n" + "=" * 80)
    print(">>> 100% UNANIMOUS PASS: ALL PLATFORM LAYERS MATCH USER'S OECD SCREENSHOT! <<<")
    print("=" * 80)
else:
    print("\n>>> VERIFICATION FAILED: Review mismatches above <<<")
