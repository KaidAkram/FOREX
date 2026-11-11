/**
 * Server-side Biquote API client with multi-importance fan-out, short TTL caching,
 * and strict query sanitization. Never invoked directly from the browser.
 */
import {
  BiquoteCalendarEvent,
  CalendarImportance,
  filterUpcomingEvents,
  mergeAndSortCalendarEvents,
} from "./biquoteCalendar";

const BIQUOTE_BASE = "https://biquote.io/api/calendar";
const CACHE_TTL_MS = 45_000;
const REQUEST_TIMEOUT_MS = 12_000;

interface CacheEntry {
  expiresAt: number;
  data: BiquoteCalendarEvent[];
}

const upstreamCache = new Map<string, CacheEntry>();

async function fetchBiquoteJson(url: string): Promise<BiquoteCalendarEvent[]> {
  const now = Date.now();
  const cached = upstreamCache.get(url);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ShiftFX-MacroTerminal/1.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Biquote API HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("Unexpected Biquote API response shape.");
  }

  const events = payload as BiquoteCalendarEvent[];
  upstreamCache.set(url, {
    expiresAt: now + CACHE_TTL_MS,
    data: events,
  });

  // Bound cache size cleanly
  if (upstreamCache.size > 100) {
    const oldestKey = upstreamCache.keys().next().value;
    if (oldestKey) upstreamCache.delete(oldestKey);
  }

  return events;
}

function buildCalendarQueryUrl(
  endpoint: string,
  params: {
    countries?: string[];
    importance?: CalendarImportance;
    from?: string;
    to?: string;
    limit?: number;
  }
): string {
  const qs = new URLSearchParams();
  if (params.countries && params.countries.length > 0) {
    qs.set("countries", params.countries.join(","));
  }
  if (params.importance) {
    qs.set("importance", params.importance);
  }
  if (params.from) {
    qs.set("from", params.from);
  }
  if (params.to) {
    qs.set("to", params.to);
  }
  if (typeof params.limit === "number") {
    qs.set("limit", String(params.limit));
  }
  const queryStr = qs.toString();
  return queryStr ? `${endpoint}?${queryStr}` : endpoint;
}

/** Fetch full economic calendar events, fanning out multi-importance requests cleanly. */
export async function fetchCalendarFromBiquote(options: {
  countries: string[];
  importanceLevels: CalendarImportance[];
  from?: string;
  to?: string;
}): Promise<BiquoteCalendarEvent[]> {
  const { countries, importanceLevels, from, to } = options;
  const levels: CalendarImportance[] =
    importanceLevels.length > 0 ? importanceLevels : ["high", "medium", "low"];

  // Biquote rejects comma-separated importance with 400 and caps unfiltered feeds at 200 items,
  // so fetching each selected importance level in parallel preserves High/Medium coverage.
  const batches = await Promise.all(
    levels.map((importance) =>
      fetchBiquoteJson(
        buildCalendarQueryUrl(BIQUOTE_BASE, { countries, importance, from, to })
      )
    )
  );

  return mergeAndSortCalendarEvents(batches, countries);
}

/** Fetch imminent upcoming economic announcements starting strictly from `now`. */
export async function fetchUpcomingFromBiquote(options: {
  countries: string[];
  importanceLevels: CalendarImportance[];
  limit: number;
}): Promise<BiquoteCalendarEvent[]> {
  const { countries, importanceLevels, limit } = options;
  const upcomingUrl = `${BIQUOTE_BASE}/upcoming`;
  const upstreamLimit = Math.min(100, Math.max(limit * 2, 30));

  let batches: BiquoteCalendarEvent[][];
  if (importanceLevels.length === 0 || importanceLevels.length === 3) {
    const single = await fetchBiquoteJson(
      buildCalendarQueryUrl(upcomingUrl, { countries, limit: upstreamLimit })
    );
    batches = [single];
  } else {
    batches = await Promise.all(
      importanceLevels.map((importance) =>
        fetchBiquoteJson(
          buildCalendarQueryUrl(upcomingUrl, {
            countries,
            importance,
            limit: upstreamLimit,
          })
        )
      )
    );
  }

  const merged = mergeAndSortCalendarEvents(batches, countries);
  return filterUpcomingEvents(merged, Date.now(), limit);
}

