// ── macro.ts — raw data types ────────────────────────────────

export type DataStatus = "published" | "manual" | "revised" | "missing";

export interface MacroDataCell {
  value: number;
  status: DataStatus;
  source: string;
}

export interface MacroMatrixRow {
  country: string;
  iso: string;
  cells: Record<string, MacroDataCell | null>;
}

export interface MacroMatrixResponse {
  indicator: string;
  slug: string;
  months: string[];
  rows: MacroMatrixRow[];
}

export interface DifferentialRow {
  month: string;
  base: number | null;
  quote: number | null;
  difference: number | null;
  is_complete: boolean;
}

export interface RatingRow {
  month: string;
  difference: number | null;
  rating: number | null;
  applied_rule: string;
  rule_version: string;
}

// ── rules.ts — rating rule types ─────────────────────────────

export interface RatingRule {
  id: number;
  min_diff: number | null;
  max_diff: number | null;
  rating: number;
  version: string | null;
  updated_at: string;
}

export interface RulesResponse {
  indicator: string;
  slug: string;
  version: string | null;
  last_updated: string | null;
  rules: RatingRule[];
}

// ── score.ts — final score types ─────────────────────────────

export type Bias = "UP" | "DOWN" | "NEUTRAL";

export interface ScoreCell {
  final_score: number | null;
  bias: Bias | null;
  is_complete: boolean;
  n_complete: number;
  n_indicators: number;
}

export interface ScoreMatrixRow {
  pair: string;
  cells: Record<string, ScoreCell | null>;
}

export interface ScoreMatrixResponse {
  months: string[];
  rows: ScoreMatrixRow[];
}

export interface DrilldownIndicator {
  indicator: string;
  slug: string;
  base_value: number | null;
  quote_value: number | null;
  difference: number | null;
  rating: number | null;
  applied_rule: string;
  is_complete: boolean;
}

export interface DrilldownResponse {
  pair: string;
  month: string;
  base_currency: string;
  quote_currency: string;
  breakdown: DrilldownIndicator[];
  total_rating: number | null;
  final_score: number | null;
  bias: Bias | null;
  is_complete: boolean;
  calculated_at: string | null;
  rule_version_snapshot: Record<string, string>;
}

// ── dashboard.ts — KPI types ─────────────────────────────────

export interface KpiResponse {
  active_fx_pairs: number;
  up_bias: number;
  down_bias: number;
  neutral_bias: number;
  active_indicators: number;
  last_calculation: string | null;
  last_data_update: string | null;
}

export interface LatestDataRow {
  indicator: string;
  country: string;
  month: string;
  value: number;
  published: string;
  source: string;
  status: DataStatus;
}

export interface DataStatusRow {
  indicator: string;
  slug: string;
  frequency: string;
  status: "Updated" | "Pending" | "Missing" | "Manual";
  last_published: string | null;
  next_expected: string;
}
