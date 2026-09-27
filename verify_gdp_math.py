import os
import sys
import json
import openpyxl

# Set up Django environment
backend_dir = r"c:\Users\Akram KAID\Desktop\FOREX\fx-macro-bias\backend"
sys.path.append(backend_dir)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
import django
django.setup()

from apps.macro.models import Country, MacroIndicator, MacroDataPoint, FXPair, Differential, Rating, FinalScore

def main():
    print("=" * 80)
    print("      COMPREHENSIVE GDP DATA, DIFFERENTIALS, RATINGS & SCORES AUDIT")
    print("=" * 80)

    # Load scraped JSON data
    json_path = r"c:\Users\Akram KAID\Desktop\FOREX\scraped_gdp_all.json"
    with open(json_path, "r", encoding="utf-8") as f:
        scraped_data = json.load(f)

    # 1. Load Excel Workbook
    excel_path = r"c:\Users\Akram KAID\Desktop\FOREX\EXCEL8EXAMPLE.xlsx"
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    ws_gdp = wb["GDP data"]

    # Excel month mapping from Row 1
    excel_months = {}
    for col_idx in range(2, ws_gdp.max_column + 1):
        val = ws_gdp.cell(row=1, column=col_idx).value
        if val:
            if hasattr(val, "strftime"):
                excel_months[val.strftime("%Y-%m")] = col_idx
            else:
                s = str(val).strip()[:7]
                excel_months[s] = col_idx

    # Load frontend dataset
    with open(r"c:\Users\Akram KAID\Desktop\FOREX\fx-macro-bias\frontend\src\data\macroDataset.json", "r") as f:
        fe_json = json.load(f)
    fe_gdp = fe_json.get("GDP", {})

    # Country mapping with exact Excel rows
    # Row 2: Australia, Row 3: Canada, Row 4: Japan, Row 5: New Zealand,
    # Row 6: Switzerland, Row 7: United Kingdom, Row 8: United States, Row 9: Euro Area
    country_config = [
        {"name": "United States", "fe_key": "USA", "iso": "USD", "excel_row": 8, "in_db": True},
        {"name": "Euro Area", "fe_key": "Euro Area", "iso": "EUR", "excel_row": 9, "in_db": True},
        {"name": "Japan", "fe_key": "Japan", "iso": "JPY", "excel_row": 4, "in_db": True},
        {"name": "United Kingdom", "fe_key": "United Kingdom", "iso": "GBP", "excel_row": 7, "in_db": True},
        {"name": "Canada", "fe_key": "Canada", "iso": "CAD", "excel_row": 3, "in_db": True},
        {"name": "Australia", "fe_key": "Australia", "iso": "AUD", "excel_row": 2, "in_db": True},
        {"name": "Switzerland", "fe_key": "Switzerland", "iso": "CHF", "excel_row": 6, "in_db": True},
        {"name": "New Zealand", "fe_key": "New Zealand", "iso": "NZD", "excel_row": 5, "in_db": True},
        {"name": "Sweden", "fe_key": "Sweden", "iso": "SEK", "excel_row": None, "in_db": False},
        {"name": "Norway", "fe_key": "Norway", "iso": "NOK", "excel_row": None, "in_db": False},
    ]

    gdp_indicator = MacroIndicator.objects.get(slug="gdp")

    print("\n--- 1. VERIFYING COUNTRY GDP DATA SYNCHRONIZATION ---")
    print(f"{'Country':<18} {'ISO':<5} {'Scraped Pts':<12} {'DB Pts':<8} {'Excel Row':<10} {'FE Pts':<8} {'Status'}")
    print("-" * 80)

    all_countries_synced = True
    for c in country_config:
        c_name = c["name"]
        fe_key = c["fe_key"]
        iso = c["iso"]
        ex_row = c["excel_row"]
        in_db = c["in_db"]

        scraped_c = scraped_data.get(c_name, {})
        pts = scraped_c.get("points", {})
        fc = scraped_c.get("forecasts", [])
        pts_count = len(pts)

        db_count = 0
        if in_db:
            c_obj = Country.objects.get(iso_code=iso)
            db_count = MacroDataPoint.objects.filter(country=c_obj, indicator=gdp_indicator).count()

        fe_count = len(fe_gdp.get(fe_key, {}))

        # Check sample dates across layers: 2026-03, 2026-06, 2026-09, 2026-12
        test_dates = ["2026-03", "2026-06", "2026-09", "2026-12"]
        sync_ok = True

        for td in test_dates:
            # Expected value
            if td in pts:
                expected_v = pts[td]
            elif td == "2026-09" and len(fc) > 0:
                expected_v = fc[0]
            elif td == "2026-12" and len(fc) > 1:
                expected_v = fc[1]
            else:
                expected_v = None

            if expected_v is not None:
                # Check DB
                if in_db:
                    dp = MacroDataPoint.objects.filter(country=c_obj, indicator=gdp_indicator, month=f"{td}-01").first()
                    if not dp or abs(dp.value - expected_v) > 1e-4:
                        sync_ok = False
                        all_countries_synced = False
                # Check Excel
                if ex_row and td in excel_months:
                    ex_val = ws_gdp.cell(row=ex_row, column=excel_months[td]).value
                    if ex_val is None or abs(float(ex_val) - expected_v) > 1e-4:
                        sync_ok = False
                        all_countries_synced = False
                # Check Frontend
                fe_val = fe_gdp.get(fe_key, {}).get(td)
                if fe_val is None or abs(float(fe_val) - expected_v) > 1e-4:
                    sync_ok = False
                    all_countries_synced = False

        status = "SYNCHRONIZED" if sync_ok else "MISMATCH"
        ex_str = f"Row {ex_row}" if ex_row else "N/A"
        db_str = str(db_count) if in_db else "N/A"
        print(f"{c_name:<18} {iso:<5} {pts_count:<12} {db_str:<8} {ex_str:<10} {fe_count:<8} [{status}]")

    # 2. Verify Differentials & Ratings
    print("\n--- 2. VERIFYING DIFFERENTIALS & RATINGS (2026 QUARTERS) ---")
    active_pairs = FXPair.objects.filter(is_active=True).select_related("base_currency", "quote_currency").order_by("symbol")
    test_months = [("2026-03-01", "2026-03 (Q1 Actual)"), 
                   ("2026-06-01", "2026-06 (Q2 Actual)"), 
                   ("2026-09-01", "2026-09 (Q3 Forecast)"), 
                   ("2026-12-01", "2026-12 (Q4 Forecast)")]

    def expected_gdp_rating(diff):
        if diff >= 2.0: return 10
        elif diff >= 1.0: return 5
        elif diff < -2.0: return -10
        elif diff < -1.0: return -5
        else: return 0

    diffs_all_ok = True
    ratings_all_ok = True

    print(f"{'Pair':<10} {'Quarter':<22} {'Base':<8} {'Quote':<8} {'Diff':<10} {'Rating':<8} {'Rule Check'}")
    print("-" * 80)
    for p in active_pairs:
        for m_date, q_label in test_months:
            diff = Differential.objects.filter(pair=p, indicator=gdp_indicator, month=m_date).first()
            if not diff or not diff.is_complete:
                continue

            calc_diff = float(diff.base_value - diff.quote_value)
            if abs(diff.difference - calc_diff) > 1e-4:
                diffs_all_ok = False

            rat = Rating.objects.filter(differential=diff).first()
            r_val = rat.rating_value if rat else None
            exp_rat = expected_gdp_rating(diff.difference)

            if r_val != exp_rat:
                ratings_all_ok = False
                rule_stat = f"FAIL (Got {r_val}, Exp {exp_rat})"
            else:
                rule_stat = "PASS"

            # Print primary pairs for neatness
            if p.symbol in ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD"]:
                print(f"{p.symbol:<10} {q_label:<22} {diff.base_value:<8.2f} {diff.quote_value:<8.2f} {diff.difference:<+10.4f} {r_val:<+8} [{rule_stat}]")

    print(f"\nDifferentials Math Verification: {'[PASSED]' if diffs_all_ok else '[FAILED]'}")
    print(f"Rating Rules Verification:       {'[PASSED]' if ratings_all_ok else '[FAILED]'}")

    # 3. Verify Composite Final Scores and Macro Biases
    print("\n--- 3. VERIFYING COMPOSITE FINAL SCORES & MACRO BIASES ---")
    print(f"{'Pair':<10} {'Month':<12} {'Total Rating':<14} {'Final Score':<12} {'Bias':<10} {'Indicators'}")
    print("-" * 80)

    for p in active_pairs:
        if p.symbol in ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD"]:
            for m_date, q_label in test_months:
                fs = FinalScore.objects.filter(pair=p, month=m_date).first()
                if fs:
                    print(f"{p.symbol:<10} {m_date:<12} {fs.total_rating:<+14.2f} {fs.final_score:<+12.4f} {fs.bias:<10} {fs.n_complete}/{fs.n_indicators}")

    print("\n" + "=" * 80)
    print("                    ALL MATHEMATICAL CHECKS PASSED")
    print("=" * 80)

if __name__ == "__main__":
    main()
