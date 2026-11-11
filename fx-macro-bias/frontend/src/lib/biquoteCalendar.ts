/**
 * Shared types, major-country defaults, query normalizers, and display formatters
 * for the Biquote Economic Calendar & Upcoming Events integration.
 */

export type CalendarImportance = "high" | "medium" | "low";

export interface BiquoteCalendarEvent {
  id: string;
  eventId?: string;
  time: string;
  period?: string | null;
  countryCode: string;
  currency: string;
  name: string;
  importance: CalendarImportance | "none" | string;
  type?: string | null;
  sector?: string | null;
  unit?: string | null;
  multiplier?: string | null;
  digits?: number | null;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  revisedPrevious?: number | null;
  revision?: number | null;
  timeMode?: string | null;
  sourceUrl?: string | null;
  source?: string | null;
}

export interface CalendarCountryOption {
  code: string;
  currency: string;
  labelFr: string;
  labelEn: string;
  flagIso: string;
}

export const CALENDAR_IMPORTANCE_LEVELS: readonly CalendarImportance[] = [
  "high",
  "medium",
  "low",
] as const;

export const MAJOR_CALENDAR_COUNTRIES: readonly CalendarCountryOption[] = [
  { code: "US", currency: "USD", labelFr: "États-Unis", labelEn: "United States", flagIso: "us" },
  { code: "EU", currency: "EUR", labelFr: "Zone Euro", labelEn: "Euro Area", flagIso: "eu" },
  { code: "GB", currency: "GBP", labelFr: "Royaume-Uni", labelEn: "United Kingdom", flagIso: "gb" },
  { code: "JP", currency: "JPY", labelFr: "Japon", labelEn: "Japan", flagIso: "jp" },
  { code: "CA", currency: "CAD", labelFr: "Canada", labelEn: "Canada", flagIso: "ca" },
  { code: "AU", currency: "AUD", labelFr: "Australie", labelEn: "Australia", flagIso: "au" },
  { code: "CH", currency: "CHF", labelFr: "Suisse", labelEn: "Switzerland", flagIso: "ch" },
  { code: "NZ", currency: "NZD", labelFr: "Nouvelle-Zélande", labelEn: "New Zealand", flagIso: "nz" },
  { code: "SE", currency: "SEK", labelFr: "Suède", labelEn: "Sweden", flagIso: "se" },
  { code: "NO", currency: "NOK", labelFr: "Norvège", labelEn: "Norway", flagIso: "no" },
  { code: "CN", currency: "CNY", labelFr: "Chine", labelEn: "China", flagIso: "cn" },
] as const;

export const DEFAULT_MAJOR_COUNTRY_CODES: string[] = MAJOR_CALENDAR_COUNTRIES.map((c) => c.code);

const COUNTRY_ALIASES: Record<string, string> = {
  USA: "US",
  "UNITED STATES": "US",
  UK: "GB",
  GBR: "GB",
  "UNITED KINGDOM": "GB",
  EMU: "EU",
  EUR: "EU",
  EURO: "EU",
  "EURO AREA": "EU",
  JPN: "JP",
  JAPAN: "JP",
  CAN: "CA",
  CANADA: "CA",
  AUS: "AU",
  AUSTRALIA: "AU",
  CHE: "CH",
  SWITZERLAND: "CH",
  NZL: "NZ",
  "NEW ZEALAND": "NZ",
  SWEDEN: "SE",
  SWE: "SE",
  SEK: "SE",
  NORWAY: "NO",
  NOR: "NO",
  NOK: "NO",
  CHINA: "CN",
  CHN: "CN",
};

const MULTIPLIER_SUFFIX: Record<string, string> = {
  trillions: "T",
  billions: "B",
  millions: "M",
  thousands: "K",
  none: "",
};

/** Normalize country aliases (e.g. SWEDEN -> SE, NORWAY -> NO, UK -> GB) to Biquote ISO-2 codes. */
export function normalizeCountryCode(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase();
  if (!cleaned) return null;
  const mapped = COUNTRY_ALIASES[cleaned] || cleaned;
  return /^[A-Z]{2}$/.test(mapped) ? mapped : null;
}

/**
 * Parse comma-separated country filter string into normalized ISO-2 codes.
 * `"ALL"` / `"*"` returns `[]` (unrestricted global calendar).
 */
export function parseCountryCodesParam(
  raw: string | null | undefined,
  useDefaultIfMissing: boolean = true
): string[] {
  if (raw === undefined || raw === null || raw.trim() === "") {
    return useDefaultIfMissing ? [...DEFAULT_MAJOR_COUNTRY_CODES] : [];
  }
  const trimmed = raw.trim().toUpperCase();
  if (trimmed === "ALL" || trimmed === "*") {
    return [];
  }
  const unique = new Set<string>();
  for (const token of trimmed.split(",")) {
    const code = normalizeCountryCode(token);
    if (code) unique.add(code);
  }
  return Array.from(unique);
}

/**
 * Parse single or comma-separated importance parameter into validated Biquote importance levels.
 * Empty / `"all"` / `"any"` returns all 3 levels (`["high", "medium", "low"]`).
 */
export function parseImportanceLevelsParam(raw: string | null | undefined): CalendarImportance[] {
  if (!raw || raw.trim() === "" || ["all", "any"].includes(raw.trim().toLowerCase())) {
    return [...CALENDAR_IMPORTANCE_LEVELS];
  }
  const allowed = new Set<string>(CALENDAR_IMPORTANCE_LEVELS);
  const selected = new Set<CalendarImportance>();
  for (const part of raw.toLowerCase().split(",")) {
    const clean = part.trim();
    if (allowed.has(clean)) {
      selected.add(clean as CalendarImportance);
    }
  }
  return CALENDAR_IMPORTANCE_LEVELS.filter((lvl) => selected.has(lvl));
}

/** Merge multiple upstream Biquote arrays, deduplicate by event id, and sort chronologically ascending. */
export function mergeAndSortCalendarEvents(
  batches: BiquoteCalendarEvent[][],
  allowedCountries: string[] = []
): BiquoteCalendarEvent[] {
  const countrySet = allowedCountries.length > 0 ? new Set(allowedCountries) : null;
  const byId = new Map<string, BiquoteCalendarEvent>();

  for (const batch of batches) {
    if (!Array.isArray(batch)) continue;
    for (const ev of batch) {
      if (!ev || typeof ev.id !== "string" || typeof ev.name !== "string" || typeof ev.time !== "string") {
        continue;
      }
      const code = String(ev.countryCode || "").toUpperCase();
      if (countrySet && !countrySet.has(code)) continue;
      if (!byId.has(ev.id)) {
        byId.set(ev.id, ev);
      }
    }
  }

  return Array.from(byId.values()).sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
}

/** Keep strictly future events from `nowMs`, sorted soonest first, capped to `limit`. */
export function filterUpcomingEvents(
  events: BiquoteCalendarEvent[],
  nowMs: number = Date.now(),
  limit: number = 20
): BiquoteCalendarEvent[] {
  return events
    .filter((ev) => {
      const ts = Date.parse(ev.time);
      return Number.isFinite(ts) && ts >= nowMs;
    })
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
    .slice(0, Math.max(1, limit));
}

/** Format numeric actual/forecast/previous figures cleanly using Biquote unit, multiplier, and digits. */
export function formatCalendarStat(
  value: number | null | undefined,
  unit?: string | null,
  multiplier?: string | null,
  digits?: number | null
): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }
  const num = Number(value);
  const precision =
    typeof digits === "number" && Number.isFinite(digits)
      ? Math.max(0, Math.min(4, Math.trunc(digits)))
      : Math.abs(num) >= 100
      ? 1
      : 2;

  const formattedNum = num.toLocaleString("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
  const multSuffix = MULTIPLIER_SUFFIX[String(multiplier || "none").toLowerCase()] ?? "";
  const unitLower = String(unit || "none").toLowerCase();

  if (unitLower === "percent") {
    return `${formattedNum}${multSuffix}%`;
  }
  if (unitLower === "usd") {
    return `$${formattedNum}${multSuffix}`;
  }
  return `${formattedNum}${multSuffix}`;
}

export function getActualVsForecastTone(
  actual: number | null | undefined,
  forecast: number | null | undefined
): "beat" | "miss" | "inline" | "none" {
  if (
    actual === null ||
    actual === undefined ||
    forecast === null ||
    forecast === undefined ||
    !Number.isFinite(actual) ||
    !Number.isFinite(forecast)
  ) {
    return "none";
  }
  if (actual > forecast) return "beat";
  if (actual < forecast) return "miss";
  return "inline";
}

/** Format compact countdown relative to `nowMs` for upcoming announcements. */
export function formatRelativeCountdown(
  targetIso: string,
  nowMs: number,
  lang: "fr" | "en" = "fr"
): { label: string; isImminent: boolean } {
  const targetMs = Date.parse(targetIso);
  if (!Number.isFinite(targetMs)) {
    return { label: "—", isImminent: false };
  }
  const diffMin = Math.round((targetMs - nowMs) / 60_000);
  if (diffMin <= 0) {
    return { label: lang === "fr" ? "Maintenant" : "Now", isImminent: true };
  }
  if (diffMin < 60) {
    return {
      label: lang === "fr" ? `Dans ${diffMin} min` : `In ${diffMin}m`,
      isImminent: true,
    };
  }
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (hours < 24) {
    const label =
      lang === "fr"
        ? `Dans ${hours}h${mins > 0 ? ` ${String(mins).padStart(2, "0")}` : ""}`
        : `In ${hours}h${mins > 0 ? ` ${mins}m` : ""}`;
    return { label, isImminent: hours < 3 };
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return {
    label:
      lang === "fr"
        ? `Dans ${days}j${remHours > 0 ? ` ${remHours}h` : ""}`
        : `In ${days}d${remHours > 0 ? ` ${remHours}h` : ""}`,
    isImminent: false,
  };
}

export function sanitizeSourceUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function getCalendarFlagUrl(countryCode: string): string {
  const clean = (countryCode || "un").trim().toLowerCase();
  const iso = clean === "uk" ? "gb" : /^[a-z]{2}$/.test(clean) ? clean : "un";
  return `https://hatscripts.github.io/circle-flags/flags/${iso}.svg`;
}

