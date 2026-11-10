export type FxCell = { value: number | string | null; status: string; source?: string };
export type FxSnapshot = {
  rows: { country: string; iso?: string; cells: Record<string, FxCell | null> }[];
  freshness?: {
    status?: string;
    last_success_at?: string;
    latest_by_country?: Record<string, string>;
    error?: string;
  } | null;
};

type Country = { country: string; base: string };

const codes: Record<string, string> = {
  us: "USD",
  eu: "EUR",
  jp: "JPY",
  gb: "GBP",
  au: "AUD",
  ca: "CAD",
  ch: "CHF",
  nz: "NZD",
  se: "SEK",
  no: "NOK",
};

function findRow(snapshot: FxSnapshot, country: Country) {
  const name = country.country === "USA" ? "United States" : country.country;
  return snapshot.rows.find(
    (row) => row.country === name || row.country === country.country || row.iso === codes[country.base]
  );
}

export function validateFxSnapshot(value: unknown): FxSnapshot {
  const payload = value as FxSnapshot;
  if (
    !payload ||
    !Array.isArray(payload.rows) ||
    !payload.rows.length ||
    payload.rows.some((row) => typeof row.country !== "string" || !row.cells || typeof row.cells !== "object")
  ) {
    throw new Error("The server returned no valid FX reserve matrix.");
  }
  return payload;
}

export function fxRows(
  snapshot: FxSnapshot,
  countries: Country[],
  year: number,
  assumptions: Record<string, string>,
  months?: string[]
) {
  const displayMonths =
    months && months.length > 0
      ? months
      : Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
  return countries.map((country) => ({
    ...country,
    data: displayMonths.map((month) => {
      const point = findRow(snapshot, country)?.cells[month];
      const present =
        point?.value !== null && point?.value !== undefined && Number.isFinite(Number(point.value));
      if (present && ["published", "revised"].includes(point!.status)) {
        return { value: point!.value, status: "published" as const, isAssumption: false };
      }
      const manual =
        point?.status === "manual" && present
          ? point.value
          : assumptions[`FX Reserves_${country.country}_${month}`];
      if (manual !== undefined && manual !== null && manual !== "") {
        return { value: manual, status: "manual" as const, isAssumption: true };
      }
      return { value: null, status: "missing" as const, isAssumption: false };
    }),
  }));
}

export function fxHistory(snapshot: FxSnapshot, countries: Country[]) {
  return Object.fromEntries(
    countries.map((country) => [
      country.country,
      Object.fromEntries(
        Object.entries(findRow(snapshot, country)?.cells || {})
          .filter(
            ([, cell]) =>
              cell &&
              ["published", "revised", "manual"].includes(cell.status) &&
              cell.value !== null &&
              Number.isFinite(Number(cell.value))
          )
          .map(([month, cell]) => [month, Number(cell!.value)])
      ),
    ])
  );
}
