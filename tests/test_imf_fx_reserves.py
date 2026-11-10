import copy
import unittest
from datetime import date
from urllib.error import URLError
from urllib.parse import parse_qs, urlsplit
from imf_fx_reserves import IMFFetchError, build_url, fetch_observations, parse_observations


def fixture():
    return {
        "data": {
            "structures": [
                {
                    "dimensions": {
                        "series": [
                            {"id": "COUNTRY", "values": [{"id": "AUS"}, {"id": "CHE"}, {"id": "G163"}]},
                            {"id": "INDICATOR", "values": [{"id": "RXF11FX_REVS"}]},
                            {"id": "UNIT", "values": [{"id": "USD"}]},
                            {"id": "FREQUENCY", "values": [{"id": "M"}]},
                        ],
                        "observation": [
                            {
                                "id": "TIME_PERIOD",
                                "values": [
                                    {"id": "2026-M09"},
                                    {"id": "2026-M10"},
                                    {"id": "2026-M11"},
                                    {"id": "2026-M12"},
                                ],
                            }
                        ],
                    },
                    "attributes": {},
                }
            ],
            "dataSets": [
                {
                    "series": {
                        "0:0:0:0": {
                            "observations": {
                                "0": [35000000000.125],
                                "1": [36000000000.5],
                                "2": [None],
                                "3": [999000000000],
                            }
                        },
                        "1:0:0:0": {"observations": {"0": [700000000000], "1": [701000000000]}},
                        "2:0:0:0": {"observations": {"1": [250000000000]}},
                    }
                }
            ],
        }
    }


class IMFObservationTests(unittest.TestCase):
    def parse(self, data=None):
        return parse_observations(data or fixture(), today=date(2026, 11, 10))

    def test_october_retained_including_former_special_cutoffs(self):
        result = self.parse()
        self.assertAlmostEqual(result["Australia"]["2026-10"], 36000.0000005, places=8)
        self.assertEqual(result["Switzerland"]["2026-10"], 701000)
        self.assertEqual(result["Euro Area"]["2026-10"], 250000)

    def test_null_and_future_months_are_not_fabricated_and_zero_is_valid(self):
        data = fixture()
        data["data"]["dataSets"][0]["series"]["0:0:0:0"]["observations"]["0"] = [0]
        result = self.parse(data)["Australia"]
        self.assertEqual(result["2026-09"], 0)
        self.assertNotIn("2026-11", result)
        self.assertNotIn("2026-12", result)

    def test_new_year_needs_no_source_change(self):
        data = fixture()
        data["data"]["structures"][0]["dimensions"]["observation"][0]["values"][1] = {"id": "2027-M01"}
        self.assertIn("2027-01", parse_observations(data, today=date(2027, 2, 1))["Australia"])

    def test_reordered_country_dimension(self):
        data = fixture()
        dims = data["data"]["structures"][0]["dimensions"]["series"]
        dims[0], dims[1] = dims[1], dims[0]
        series = data["data"]["dataSets"][0]["series"]
        data["data"]["dataSets"][0]["series"] = {
            ":".join([key.split(":")[1], key.split(":")[0], "0", "0"]): value for key, value in series.items()
        }
        self.assertIn("2026-10", self.parse(data)["Switzerland"])

    def test_legacy_json_envelope(self):
        data = fixture()["data"]
        result = self.parse({"structure": data["structures"][0], "dataSets": data["dataSets"]})
        self.assertIn("2026-10", result["Euro Area"])

    def test_revision_replaces_value_without_duplicate_month(self):
        data = fixture()
        revision = copy.deepcopy(data["data"]["dataSets"][0])
        revision["series"]["0:0:0:0"]["observations"]["1"] = [37000000000]
        data["data"]["dataSets"].append(revision)
        self.assertEqual(self.parse(data)["Australia"]["2026-10"], 37000)

    def test_unit_multiplier_applied_once(self):
        data = fixture()
        data["data"]["structures"][0]["attributes"] = {"series": [{"id": "UNIT_MULT", "values": [{"id": "6"}]}]}
        series = data["data"]["dataSets"][0]["series"]["0:0:0:0"]
        series["attributes"] = [0]
        series["observations"] = {"1": [36000.125]}
        self.assertEqual(self.parse(data)["Australia"]["2026-10"], 36000.125)

    def test_empty_invalid_nonfinite_and_wrong_units_fail(self):
        for data in [{}, {"data": {"structures": [], "dataSets": []}}]:
            with self.assertRaises(IMFFetchError):
                parse_observations(data)
        for value in [float("inf"), float("nan")]:
            data = fixture()
            data["data"]["dataSets"][0]["series"]["0:0:0:0"]["observations"]["1"] = [value]
            with self.assertRaises(IMFFetchError):
                self.parse(data)
        data = fixture()
        data["data"]["structures"][0]["dimensions"]["series"][2]["values"][0]["id"] = "EUR"
        with self.assertRaises(IMFFetchError):
            self.parse(data)

    def test_url_uses_g163_encoded_filter_no_export_limit_and_no_fixed_end(self):
        url = build_url()
        self.assertIn("G163", url)
        self.assertNotIn("EA20", url)
        self.assertIn("c%5BTIME_PERIOD%5D", url)
        params = parse_qs(urlsplit(url).query)
        self.assertEqual(params["c[TIME_PERIOD]"], ["ge:2022-01-01"])
        self.assertNotIn("limit", params)

    def test_transport_failure_is_not_reported_as_cached_success(self):
        def offline(*args, **kwargs):
            raise URLError("unavailable")

        with self.assertRaises(IMFFetchError):
            fetch_observations(opener=offline)
