"""
Syncs backend MacroDataPoint, FX Reserves, and pair-level Equity records
to macroDataset.json and macroDataset.ts safely.
"""
import json
import os
import re
import sys
from pathlib import Path

import django

backend_dir = Path(__file__).resolve().parent / "fx-macro-bias" / "backend"
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(Path(__file__).resolve().parent))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.macro.models import Differential, MacroDataPoint  # noqa: E402

INDICATOR_NAME_MAP = {
    "gdp": "GDP",
    "cpi": "CPI",
    "interest_rate": "Interest Rate",
    "fx_reserves": "FX Reserves",
    "ca_gdp": "Current Account",
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
    root = Path(__file__).resolve().parent
    print("--> Querying MacroDataPoint records from database...")
    master_db = {
        "GDP": {},
        "CPI": {},
        "Interest Rate": {},
        "FX Reserves": {},
        "Current Account": {},
        "Equity": {},
    }

    for ind_name in master_db:
        if ind_name == "Equity":
            continue
        for c_display in COUNTRY_MAP.values():
            master_db[ind_name][c_display] = {}

    dps = (
        MacroDataPoint.objects.filter(is_active_value=True)
        .select_related("country", "indicator")
        .order_by("month")
    )
    count = 0
    for dp in dps:
        ind_key = INDICATOR_NAME_MAP.get(dp.indicator.slug)
        if not ind_key:
            continue
        c_name = COUNTRY_MAP.get(dp.country.name)
        if not c_name:
            continue
        m_str = dp.month.strftime("%Y-%m")
        master_db[ind_key][c_name][m_str] = dp.value
        count += 1
    print(f"--> Extracted {count} country MacroDataPoint rows.")

    # Pair-level FX Reserves (from Differential + Rating)
    pair_fx = {}
    fx_diffs = (
        Differential.objects.filter(indicator__slug="fx_reserves", pair__is_active=True)
        .select_related("pair", "rating")
        .order_by("pair__symbol", "month")
    )
    for d in fx_diffs:
        ym = d.month.strftime("%Y-%m")
        try:
            rat_val = int(d.rating.rating_value) if d.rating.rating_value is not None else 0
        except Exception:
            rat_val = 0
        pair_fx.setdefault(d.pair.symbol, {})[ym] = {
            "base_flow": d.base_value,
            "quote_flow": d.quote_value,
            "spread": d.difference,
            "rating": rat_val,
        }

    # Pair-level Equity (from equity_dataset_cache.json, verified against DB Differential/Rating)
    cache_path = root / "equity_dataset_cache.json"
    fe_pairs = {}
    if cache_path.exists():
        with open(cache_path, "r", encoding="utf-8") as f:
            raw_pairs = json.load(f).get("pairs", {})
        for sym, months_map in raw_pairs.items():
            fe_pairs[sym] = months_map
            fe_pairs[sym.replace("/", " ")] = months_map
            fe_pairs[sym.replace(" ", "/")] = months_map
    else:
        eq_diffs = (
            Differential.objects.filter(indicator__slug="equity", pair__is_active=True, is_complete=True)
            .select_related("pair", "rating")
            .order_by("pair__symbol", "month")
        )
        for d in eq_diffs:
            ym = d.month.strftime("%Y-%m")
            try:
                rat_val = int(d.rating.rating_value) if d.rating.rating_value is not None else 0
            except Exception:
                rat_val = 0
            pt = {
                "synth_ath": None,
                "synth_cur": None,
                "change_synth": float(d.quote_value),
                "base_ath": None,
                "base_cur": None,
                "change_index": float(d.base_value),
                "final_change": float(d.difference),
                "rating": rat_val,
            }
            fe_pairs.setdefault(d.pair.symbol, {})[ym] = pt
            fe_pairs.setdefault(d.pair.symbol.replace("/", " "), {})[ym] = pt

    # 1. Update macroDataset.json
    json_path = root / "fx-macro-bias" / "frontend" / "src" / "data" / "macroDataset.json"
    fe_json = {}
    if json_path.exists():
        with open(json_path, "r", encoding="utf-8") as f:
            fe_json = json.load(f)

    for k, v in master_db.items():
        fe_json[k] = v
    fe_json["PairFXReserves"] = pair_fx
    fe_json["PairEquity"] = fe_pairs

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(fe_json, f, indent=2)
    print(f"--> Updated {json_path}")

    # 2. Update macroDataset.ts (MASTER_MACRO_DATABASE + PAIR_EQUITY_DATA)
    ts_path = root / "fx-macro-bias" / "frontend" / "src" / "data" / "macroDataset.ts"
    with open(ts_path, "r", encoding="utf-8") as f:
        ts_content = f.read()

    db_marker = "export const MASTER_MACRO_DATABASE: Record<string, Record<string, Record<string, number | null>>> = "
    matrix_fn_marker = "export function getMacroMatrixData(indicator: string, year: number) {"
    prefix = ts_content.split(db_marker, 1)[0]
    after_db = ts_content.split(matrix_fn_marker, 1)[1]
    ts_content = (
        prefix
        + db_marker
        + json.dumps(master_db, indent=2)
        + ";\n\n"
        + matrix_fn_marker
        + after_db
    )

    pair_eq_marker = "export const PAIR_EQUITY_DATA:"
    diff_fn_marker = "export function getCombinedDifferentialData("
    prefix_eq = ts_content.split(pair_eq_marker, 1)[0]
    after_eq = ts_content.split(diff_fn_marker, 1)[1]
    pair_eq_decl = (
        "export const PAIR_EQUITY_DATA: Record<string, Record<string, { "
        "synth_ath: number | null; synth_cur: number | null; change_synth: number; "
        "base_ath: number | null; base_cur: number | null; change_index: number; "
        "final_change: number; rating: number; as_of_date?: string; is_provisional?: boolean; }>> = "
    )
    ts_content = (
        prefix_eq
        + pair_eq_decl
        + json.dumps(fe_pairs, indent=2)
        + ";\n\n"
        + diff_fn_marker
        + after_eq
    )

    with open(ts_path, "w", encoding="utf-8") as f:
        f.write(ts_content)
    print(f"--> Updated {ts_path}")


if __name__ == "__main__":
    main()
