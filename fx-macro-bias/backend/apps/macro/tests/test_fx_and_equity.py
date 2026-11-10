from datetime import date
import io
import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.macro.models import (
    Country,
    Differential,
    FXPair,
    FinalScore,
    MacroDataPoint,
    MacroIndicator,
    Rating,
    SystemSetting,
)
from apps.macro.services.calculator import calculate_differential, recalculate_full_matrix
from apps.macro.services.calendar import get_active_horizon_months, get_forward_months
from apps.macro.services.equity import REFRESH_KEY as EQ_REFRESH_KEY, refresh_equity
from apps.macro.services.fx_reserves import REFRESH_KEY as FX_REFRESH_KEY, refresh_fx_reserves
from apps.macro.signals import disable_macro_signals
from equity_engine import EquityFetchError
from imf_fx_reserves import IMFFetchError


class FXReserveAndEquityTests(TestCase):
    def setUp(self):
        self.australia = Country.objects.create(name="Australia", iso_code="AUD", imf_country_code="AUS")
        self.switzerland = Country.objects.create(name="Switzerland", iso_code="CHF", imf_country_code="CHE")
        self.fx_indicator = MacroIndicator.objects.create(
            name="FX Reserves", slug="fx_reserves", frequency="M", default_source="IMF"
        )
        self.eq_indicator = MacroIndicator.objects.create(
            name="Equity Index Return (%)", slug="equity", frequency="M", default_source="YF"
        )
        self.admin = get_user_model().objects.create_user("fixture-admin", is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        with disable_macro_signals():
            self.old = MacroDataPoint.objects.create(
                country=self.australia,
                indicator=self.fx_indicator,
                month=date(2026, 9, 1),
                value=35000,
                source="Previously imported",
                status="published",
            )
        self.snapshot = (
            {"Australia": {"2026-10": 36000.125}, "Switzerland": {"2026-10": 700000}},
            {
                "source": "Official IMF SDMX 3.0 (RXF11FX_REVS)",
                "fetched_at": "2026-11-10T12:00:00+00:00",
                "latest_by_country": {"Australia": "2026-10", "Switzerland": "2026-10"},
                "observation_count": 2,
            },
        )

    @patch("apps.macro.services.fx_reserves.fetch_observations")
    def test_new_month_appends_and_old_published_value_is_preserved(self, fetch):
        fetch.return_value = self.snapshot
        result = refresh_fx_reserves(recalculate=False)
        self.old.refresh_from_db()
        self.assertEqual(self.old.value, 35000)
        self.assertEqual(MacroDataPoint.objects.filter(indicator=self.fx_indicator).count(), 3)
        self.assertEqual(result["latest_by_country"]["Switzerland"], "2026-10")

    @patch("apps.macro.services.fx_reserves.fetch_observations")
    def test_repeated_refresh_is_idempotent_and_applies_revisions(self, fetch):
        fetch.return_value = self.snapshot
        refresh_fx_reserves(recalculate=False)
        self.snapshot[0]["Australia"]["2026-10"] = 36500.5
        refresh_fx_reserves(recalculate=False)
        points = MacroDataPoint.objects.filter(
            country=self.australia, indicator=self.fx_indicator, month=date(2026, 10, 1), is_active_value=True
        )
        self.assertEqual(points.count(), 1)
        self.assertEqual(points.get().value, 36500.5)

    @patch("apps.macro.services.fx_reserves.fetch_observations")
    def test_failure_preserves_data_and_last_success_metadata(self, fetch):
        SystemSetting.objects.create(key=FX_REFRESH_KEY, value={"last_success_at": "old-success"})
        fetch.side_effect = IMFFetchError("upstream unavailable")
        with self.assertRaises(IMFFetchError):
            refresh_fx_reserves(recalculate=False)
        self.old.refresh_from_db()
        self.assertEqual(self.old.value, 35000)
        metadata = SystemSetting.objects.get(key=FX_REFRESH_KEY).value
        self.assertEqual(metadata["last_success_at"], "old-success")
        self.assertEqual(metadata["status"], "ERROR")

    @patch("apps.macro.services.calculator.recalculate_full_matrix", side_effect=RuntimeError("calculation failed"))
    @patch("apps.macro.services.fx_reserves.fetch_observations")
    def test_recalculation_failure_rolls_back_the_ingestion(self, fetch, recalculate):
        fetch.return_value = self.snapshot
        with self.assertRaises(RuntimeError):
            refresh_fx_reserves()
        self.assertEqual(MacroDataPoint.objects.filter(indicator=self.fx_indicator).count(), 1)

    @patch("apps.macro.services.fx_reserves.fetch_observations")
    def test_official_release_supersedes_a_manual_cell(self, fetch):
        with disable_macro_signals():
            MacroDataPoint.objects.create(
                country=self.australia, indicator=self.fx_indicator, month=date(2026, 10, 1), value=1, status="manual"
            )
        fetch.return_value = self.snapshot
        refresh_fx_reserves(recalculate=False)
        point = MacroDataPoint.objects.get(
            country=self.australia, indicator=self.fx_indicator, month=date(2026, 10, 1), is_active_value=True
        )
        self.assertEqual(point.status, "published")
        self.assertEqual(point.value, 36000.125)

    @patch("apps.macro.services.fx_reserves.fetch_observations")
    def test_matrix_displays_october_and_real_refresh_metadata(self, fetch):
        fetch.return_value = self.snapshot
        refresh_fx_reserves(recalculate=False)
        response = self.client.get("/api/admin/macro-data/matrix?indicator=fx_reserves")
        self.assertEqual(response.status_code, 200)
        row = next(row for row in response.data["rows"] if row["country"] == "Australia")
        self.assertEqual(row["cells"]["2026-10"]["value"], 36000.125)
        self.assertEqual(row["cells"]["2026-10"]["status"], "published")
        self.assertEqual(response.data["freshness"]["latest_by_country"]["Australia"], "2026-10")

    def test_refresh_endpoint_denies_anonymous_writes(self):
        self.client.force_authenticate(user=None)
        self.assertIn(self.client.post("/api/admin/macro-data/fx-reserves/refresh").status_code, [401, 403])
        self.assertIn(self.client.post("/api/admin/macro-data/equity/refresh").status_code, [401, 403])

    @patch("apps.macro.views.fx_reserves.refresh_fx_reserves", side_effect=IMFFetchError("unavailable"))
    def test_endpoint_failure_has_no_false_success(self, refresh):
        response = self.client.post("/api/admin/macro-data/fx-reserves/refresh")
        self.assertEqual(response.status_code, 502)
        self.assertIs(response.data["success"], False)

    @patch("imf_fx_reserves.urllib.request.urlopen")
    def test_command_reads_sdmx_bytes_and_persists_api_visible_october(self, opener):
        payload = {
            "data": {
                "structures": [
                    {
                        "dimensions": {
                            "series": [{"id": "COUNTRY", "values": [{"id": "AUS"}]}],
                            "observation": [{"id": "TIME_PERIOD", "values": [{"id": "2026-M10"}]}],
                        },
                        "attributes": {},
                    }
                ],
                "dataSets": [{"series": {"0": {"observations": {"0": [36000000125]}}}}],
            }
        }
        opener.return_value = io.BytesIO(json.dumps(payload).encode())
        call_command("scrape_imf_fx", start_year=2022)
        request = opener.call_args.args[0]
        self.assertEqual(request.get_header("Accept"), "application/json")
        self.assertEqual(opener.call_args.kwargs["timeout"], 45)
        point = MacroDataPoint.objects.get(country=self.australia, month=date(2026, 10, 1))
        self.assertEqual(point.value, 36000.000125)
        self.assertEqual(point.status, "published")

    @patch("apps.macro.services.fx_reserves.fetch_observations")
    def test_real_calculation_chain_updates_differential_rating_and_score(self, fetch):
        MacroIndicator.objects.filter(slug="equity").delete()
        pair = FXPair.objects.create(base_currency=self.australia, quote_currency=self.switzerland, symbol="AUD/CHF")
        series = {"Australia": {}, "Switzerland": {}}
        for i in range(13):
            absolute = 2025 * 12 + 9 + i
            year, month = divmod(absolute, 12)
            key = f"{year}-{month + 1:02d}"
            series["Australia"][key] = 1000 + 30 * i
            series["Switzerland"][key] = 2000 + 10 * i
        fetch.return_value = (series, self.snapshot[1])
        result = refresh_fx_reserves()
        differential = Differential.objects.get(pair=pair, indicator=self.fx_indicator, month=date(2026, 10, 1))
        self.assertEqual(differential.difference, 20)
        self.assertEqual(Rating.objects.get(differential=differential).rating_value, 0)
        score = FinalScore.objects.get(pair=pair, month=date(2026, 10, 1))
        self.assertEqual(score.final_score, 0)
        self.assertGreater(result["records_recalculated"], 0)
        counts = (Differential.objects.count(), Rating.objects.count(), FinalScore.objects.count())
        refresh_fx_reserves()
        self.assertEqual(counts, (Differential.objects.count(), Rating.objects.count(), FinalScore.objects.count()))

    @patch("apps.macro.services.equity.equity_engine.build_equity_dataset")
    def test_equity_uses_synth_minus_index_purges_future_and_country_rows(self, build_eq):
        pair = FXPair.objects.create(base_currency=self.australia, quote_currency=self.switzerland, symbol="AUD/CHF")
        with disable_macro_signals():
            MacroDataPoint.objects.create(
                country=self.australia, indicator=self.eq_indicator, month=date(2026, 12, 1), value=-1.0
            )
            Differential.objects.create(
                pair=pair,
                indicator=self.eq_indicator,
                month=date(2026, 12, 1),
                base_value=-0.01,
                quote_value=-0.03,
                difference=0.02,
                is_complete=True,
            )
        build_eq.return_value = (
            {
                "AUD/CHF": {
                    "2026-10": {
                        "change_index": -0.02,
                        "change_synth": -0.04,
                        "final_change": -0.02,
                        "rating": -2,
                    }
                }
            },
            {},
        )
        res = refresh_equity()
        self.assertEqual(res["status"], "SUCCESS")
        # Legacy country MacroDataPoints and copied 2026-12 differentials are purged.
        self.assertEqual(MacroDataPoint.objects.filter(indicator=self.eq_indicator).count(), 0)
        self.assertFalse(Differential.objects.filter(indicator=self.eq_indicator, month=date(2026, 12, 1)).exists())
        diff = Differential.objects.get(pair=pair, indicator=self.eq_indicator, month=date(2026, 10, 1))
        self.assertAlmostEqual(diff.difference, -0.02, places=6)
        self.assertEqual(Rating.objects.get(differential=diff).rating_value, -2)

        # Recalculation engines must preserve quote_value - base_value (Synthetic - Index)!
        calculate_differential(pair.pk, self.eq_indicator.pk, date(2026, 10, 1))
        diff.refresh_from_db()
        self.assertAlmostEqual(diff.difference, -0.02, places=6)
        recalculate_full_matrix()
        diff.refresh_from_db()
        self.assertAlmostEqual(diff.difference, -0.02, places=6)

        # Pair matrix API exposes mode="pair"
        matrix_resp = self.client.get("/api/admin/macro-data/matrix?indicator=equity")
        self.assertEqual(matrix_resp.status_code, 200)
        self.assertEqual(matrix_resp.data["mode"], "pair")
        self.assertEqual(matrix_resp.data["pair_rows"][0]["cells"]["2026-10"]["final_change"], -0.02)

    @patch("apps.macro.services.equity.equity_engine.build_equity_dataset", side_effect=EquityFetchError("offline"))
    def test_equity_failure_preserves_existing_records_and_records_error(self, _):
        pair = FXPair.objects.create(base_currency=self.australia, quote_currency=self.switzerland, symbol="AUD/CHF")
        Differential.objects.create(
            pair=pair,
            indicator=self.eq_indicator,
            month=date(2026, 10, 1),
            base_value=-0.02,
            quote_value=-0.04,
            difference=-0.02,
            is_complete=True,
        )
        with self.assertRaises(CommandError):
            call_command("scrape_equity")
        self.assertEqual(Differential.objects.filter(indicator=self.eq_indicator).count(), 1)
        self.assertEqual(SystemSetting.objects.get(key=EQ_REFRESH_KEY).value["status"], "ERROR")

    @override_settings(DEBUG=False, DEV_MOCK_ADMIN=False)
    def test_production_non_staff_user_cannot_trigger_refresh(self):
        trader = get_user_model().objects.create_user("fixture-trader", is_staff=False)
        self.client.force_authenticate(trader)
        self.assertEqual(self.client.post("/api/admin/macro-data/fx-reserves/refresh").status_code, 403)
        self.assertEqual(self.client.post("/api/admin/macro-data/equity/refresh").status_code, 403)

    def test_calendar_horizon_adds_n_plus_3_months_to_matrix_endpoints(self):
        self.assertEqual(get_forward_months(3, date(2026, 11, 7)), ["2026-12", "2027-01", "2027-02"])
        horizon = sorted(get_active_horizon_months(3, date(2026, 11, 7)))
        self.assertEqual(len(horizon), 14)
        self.assertEqual(horizon[-3:], ["2026-12", "2027-01", "2027-02"])

        expected_forward = get_forward_months(3)
        fx_resp = self.client.get("/api/admin/macro-data/matrix?indicator=fx_reserves")
        self.assertEqual(fx_resp.status_code, 200)
        for m in expected_forward:
            self.assertIn(m, fx_resp.data["months"])

        eq_resp = self.client.get("/api/admin/macro-data/matrix?indicator=equity")
        self.assertEqual(eq_resp.status_code, 200)
        for m in expected_forward:
            self.assertIn(m, eq_resp.data["months"])

        score_resp = self.client.get("/api/admin/final-score/matrix")
        self.assertEqual(score_resp.status_code, 200)
        for m in expected_forward:
            self.assertIn(m, score_resp.data["months"])


