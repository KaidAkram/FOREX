export type EquityPairCell = {
  change_index: number | null;
  change_synth: number | null;
  final_change: number | null;
  rating: number | null;
  is_complete?: boolean;
  base_cur?: number | null;
  base_ath?: number | null;
  synth_cur?: number | null;
  synth_ath?: number | null;
  as_of_date?: string | null;
  is_provisional?: boolean;
};

export type EquitySnapshot = {
  mode: "pair";
  pair_rows: {
    pair: string;
    base_currency?: string;
    quote_currency?: string;
    cells: Record<string, EquityPairCell | null>;
  }[];
  freshness?: {
    status?: string;
    last_success_at?: string;
    latest_month?: string;
    error?: string;
  } | null;
};

export function validateEquitySnapshot(value: unknown): EquitySnapshot {
  const payload = value as EquitySnapshot;
  if (
    !payload ||
    !Array.isArray(payload.pair_rows) ||
    !payload.pair_rows.length ||
    payload.pair_rows.some(
      (row) => typeof row.pair !== "string" || !row.cells || typeof row.cells !== "object"
    )
  ) {
    throw new Error("The server returned no valid pair-level Equity snapshot.");
  }
  return payload;
}

export function equitySnapshotToPairMap(
  snapshot: EquitySnapshot
): Record<string, Record<string, EquityPairCell>> {
  const out: Record<string, Record<string, EquityPairCell>> = {};
  for (const row of snapshot.pair_rows) {
    const cleanMap: Record<string, EquityPairCell> = {};
    for (const [month, cell] of Object.entries(row.cells || {})) {
      if (
        cell &&
        cell.change_index !== null &&
        cell.change_synth !== null &&
        cell.final_change !== null
      ) {
        cleanMap[month] = cell;
      }
    }
    out[row.pair] = cleanMap;
    out[row.pair.replace("/", " ")] = cleanMap;
  }
  return out;
}
