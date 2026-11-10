import unittest
from datetime import date
import pandas as pd

from equity_engine import FX_TICKERS, compute_equity_from_frames, rate_equity


def _df(rows):
    return pd.DataFrame(rows, columns=["Open", "High", "Close"]).set_index(
        pd.Index([r[0] for r in rows])
    )[["Open", "High", "Close"]]


def _ohlc(rows):
    return pd.DataFrame(
        {"Open": [r[1] for r in rows], "High": [r[2] for r in rows], "Close": [r[3] for r in rows]},
        index=[r[0] for r in rows],
    )


class EquityCalculationTests(unittest.TestCase):
    def test_green_candle_ath_ignores_red_candle_high_and_subtracts_synth_minus_index(self):
        # Day 1 (2026-09-01): Green index candle (Open=100, High=110, Close=105); Green FX (Open=1.0, High=1.0, Close=1.0)
        #   => Green Index ATH = 110; Green Synth ATH = 110 * 1.0 = 110
        # Day 2 (2026-09-02): Red index candle (Open=108, High=150, Close=102) MUST BE IGNORED for ATH!
        #   FX rises to (Open=1.0, High=1.2, Close=1.2) -> Synth Open=108, Close=122.4 (GREEN!), High=180
        #   => Green Index ATH stays 110, while Green Synth ATH becomes 180!
        # Day 3 (2026-10-15): Index closes at 99 (down -10% vs 110), FX at 1.5 -> Synth Close = 148.5 (-17.5% vs 180)
        #   Étape 1 (Change_Index)     = (99 - 110) / 110     = -0.10 (-10.00%)
        #   Étape 2 (Change_FXxIndex)  = (148.5 - 180) / 180  = -0.175 (-17.50%)
        #   Étape 3 (Final = Étape2 - Étape1) = -0.175 - (-0.10) = -0.075 (-7.50%)
        #   (Old buggy engine gave +0.075!)
        idx = _ohlc([
            ("2026-09-01", 100.0, 110.0, 105.0),
            ("2026-09-02", 108.0, 150.0, 102.0),
            ("2026-10-15", 98.0, 100.0, 99.0),
        ])
        fx = _ohlc([
            ("2026-09-01", 1.0, 1.0, 1.0),
            ("2026-09-02", 1.0, 1.2, 1.2),
            ("2026-10-15", 1.5, 1.5, 1.5),
        ])
        pairs, _ = compute_equity_from_frames(
            {"EUR": idx},
            {"EUR/USD": fx},
            start_year=2026,
            today=date(2026, 11, 10),
        )
        oct_pt = pairs["EUR/USD"]["2026-10"]
        self.assertEqual(oct_pt["base_ath"], 110.0)
        self.assertEqual(oct_pt["synth_ath"], 180.0)
        self.assertAlmostEqual(oct_pt["change_index"], -0.10, places=8)
        self.assertAlmostEqual(oct_pt["change_synth"], -0.175, places=8)
        self.assertAlmostEqual(oct_pt["final_change"], -0.075, places=8)
        self.assertEqual(oct_pt["rating"], rate_equity(-0.075))
        # November has no candles in fixture and MUST NOT copy October!
        self.assertNotIn("2026-11", pairs["EUR/USD"])
        self.assertNotIn("2026-12", pairs["EUR/USD"])

    def test_all_28_canonical_pairs_present_in_fx_tickers(self):
        canonical = {
            "EUR/USD", "EUR/GBP", "EUR/JPY", "EUR/CHF", "EUR/CAD", "EUR/AUD", "EUR/NZD",
            "GBP/USD", "GBP/JPY", "GBP/CHF", "GBP/CAD", "GBP/AUD", "GBP/NZD",
            "USD/JPY", "USD/CHF", "USD/CAD", "USD/AUD", "USD/NZD",
            "CHF/JPY", "CAD/JPY", "AUD/JPY", "NZD/JPY",
            "CAD/CHF", "AUD/CHF", "NZD/CHF", "AUD/CAD", "NZD/CAD", "AUD/NZD",
        }
        self.assertTrue(canonical.issubset(set(FX_TICKERS.keys())))
