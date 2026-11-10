"""Live IMF International Liquidity observations, without release-date guesses.

The endpoint is the same IL / RXF11FX_REVS / USD / monthly series supplied
for note 1. Failed or empty responses raise; they never masquerade as Excel data.
"""
from __future__ import annotations

import json
import math
import re
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from decimal import Decimal

COUNTRY_CODES = {
    "AUS": "Australia",
    "CAN": "Canada",
    "JPN": "Japan",
    "CHE": "Switzerland",
    "NZL": "New Zealand",
    "USA": "United States",
    "GBR": "United Kingdom",
    "G163": "Euro Area",
    "SWE": "Sweden",
    "NOR": "Norway",
}
DATAFLOW = "https://api.imf.org/external/sdmx/3.0/data/dataflow/IMF.STA/IL/13.0.1"


class IMFFetchError(RuntimeError):
    """The official feed could not be retrieved or validated."""


def build_url(start_year=2022):
    if not isinstance(start_year, int) or not 1900 <= start_year <= date.today().year:
        raise ValueError("start_year must be between 1900 and the current year")
    # No UI export limit and no fixed end date: future releases need no code change.
    params = urllib.parse.urlencode({
        "c[TIME_PERIOD]": f"ge:{start_year}-01-01",
        "attributes": "all",
        "detail": "full",
        "includeHistory": "false",
    })
    return f"{DATAFLOW}/{'+'.join(COUNTRY_CODES)}.RXF11FX_REVS.USD.M?{params}"


def normalize_month(value):
    match = re.fullmatch(r"(\d{4})-(?:M)?(\d{1,2})", str(value))
    if not match or not 1 <= int(match[2]) <= 12:
        raise IMFFetchError(f"Unexpected IMF monthly period: {value!r}")
    return f"{int(match[1]):04d}-{int(match[2]):02d}"


def _dimension_value(dimension, index):
    index = int(index)
    values = dimension["values"]
    if index < 0 or index >= len(values):
        raise IMFFetchError("IMF dimension index is out of bounds")
    value = values[index]
    return value.get("id", value.get("value"))


def _unit_multiplier(structure, dataset, series, observation):
    multiplier = 0
    # More specific attributes override dataset-level attributes when supplied.
    for level, record in [("dataSet", dataset), ("series", series), ("observation", observation)]:
        definitions = structure.get("attributes", {}).get(level, [])
        indexes = record[1:] if level == "observation" else record.get("attributes", [])
        for position, definition in enumerate(definitions):
            if definition.get("id", "").upper() != "UNIT_MULT":
                continue
            if position >= len(indexes) or indexes[position] is None:
                continue
            multiplier = int(_dimension_value(definition, indexes[position]))
    if not -18 <= multiplier <= 18:
        raise IMFFetchError("Unsupported IMF UNIT_MULT")
    return multiplier


def parse_observations(payload, *, today=None):
    """Parse SDMX-JSON 2.x and the legacy structure/dataSets envelope.

    All returned values are millions of USD. Absent months stay absent; zero
    is a valid observation, and a country's publication lag is not inferred.
    """
    today = today or date.today()
    try:
        envelope = payload.get("data", payload)
        datasets = envelope.get("dataSets", [])
        structures = envelope.get("structures") or [payload.get("structure") or envelope.get("structure")]
        if not datasets or not all(isinstance(item, dict) for item in structures):
            raise IMFFetchError("IMF response contains no SDMX datasets/structures")
        result = {}
        for dataset in datasets:
            structure = structures[int(dataset.get("structure", 0))]
            dimensions = structure["dimensions"]["series"]
            observations = structure["dimensions"]["observation"]
            country_position = next(
                (i for i, dim in enumerate(dimensions) if dim.get("id", "").upper() in {"COUNTRY", "REF_AREA"}),
                None,
            )
            if country_position is None:
                candidates = [
                    i
                    for i, dim in enumerate(dimensions)
                    if any(value.get("id") in COUNTRY_CODES for value in dim.get("values", []))
                ]
                if len(candidates) != 1:
                    raise IMFFetchError("Cannot identify the IMF country dimension")
                country_position = candidates[0]
            time_position = next(i for i, dim in enumerate(observations) if dim.get("id") == "TIME_PERIOD")
            for key, series in dataset.get("series", {}).items():
                indexes = key.split(":")
                code = _dimension_value(dimensions[country_position], indexes[country_position])
                name = COUNTRY_CODES.get(code)
                if not name:
                    continue
                # Validate the requested indicator/unit/frequency if explicitly present.
                expected = {"INDICATOR": "RXF11FX_REVS", "UNIT": "USD", "FREQUENCY": "M", "FREQ": "M"}
                for position, dimension in enumerate(dimensions):
                    required = expected.get(dimension.get("id", "").upper())
                    if required and _dimension_value(dimension, indexes[position]) != required:
                        raise IMFFetchError("IMF response does not match FX reserves / USD / monthly")
                for observation_key, observation in series.get("observations", {}).items():
                    if not observation or observation[0] is None:
                        continue
                    time_index = observation_key.split(":")[time_position]
                    month = normalize_month(_dimension_value(observations[time_position], time_index))
                    if month > today.strftime("%Y-%m"):
                        continue
                    value = float(observation[0])
                    if not math.isfinite(value):
                        raise IMFFetchError("IMF returned a non-finite observation")
                    exponent = _unit_multiplier(structure, dataset, series, observation)
                    scaled = float(Decimal(str(observation[0])).scaleb(exponent - 6))
                    if not math.isfinite(scaled):
                        raise IMFFetchError("IMF observation cannot be expressed in millions of USD")
                    result.setdefault(name, {})[month] = scaled
        if not any(result.values()):
            raise IMFFetchError("IMF returned no usable FX reserve observations")
        return result
    except IMFFetchError:
        raise
    except (KeyError, IndexError, TypeError, ValueError, StopIteration) as error:
        raise IMFFetchError("Unexpected IMF SDMX response structure") from error


def fetch_observations(start_year=2022, *, opener=None, today=None):
    opener = opener or urllib.request.urlopen
    # Live IMF SDMX 3.0 rejects application/vnd.sdmx.data+json;version=2.0 with HTTP 500;
    # application/json returns HTTP 200 with full SDMX-JSON structure and series.
    request = urllib.request.Request(
        build_url(start_year),
        headers={
            "Accept": "application/json",
            "User-Agent": "ShiftFX/1.0 (IMF International Liquidity data client)",
            "Cache-Control": "no-cache",
        },
    )
    try:
        with opener(request, timeout=45) as response:
            payload = json.loads(response.read().decode("utf-8-sig"), parse_float=Decimal)
        values = parse_observations(payload, today=today)
    except IMFFetchError:
        raise
    except (OSError, ValueError) as error:
        raise IMFFetchError("Official IMF FX reserves refresh failed; existing data was preserved") from error
    return values, {
        "source": "Official IMF SDMX 3.0 (RXF11FX_REVS)",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "latest_by_country": {country: max(points) for country, points in values.items()},
        "observation_count": sum(len(points) for points in values.values()),
    }
