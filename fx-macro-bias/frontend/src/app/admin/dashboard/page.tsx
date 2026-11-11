"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  FlameIcon,
  PulseIcon,
  ShieldCheckIcon,
  SlidersIcon,
  SparklesFillIcon,
  StackIcon,
  SyncIcon,
} from "@primer/octicons-react";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  COUNTRIES,
  INDICATORS,
  PAIRS,
  SYSTEM_CURRENT_YEAR,
  getCombinedDifferentialData,
  getCurrentLiveMonthKey,
  getDisplayMonthsForYear,
  getMacroMatrixData,
} from "@/data/macroDataset";
import {
  AdminPageHeader,
  CatalogueKPICard,
  WASH_STYLES,
  WashVariant,
} from "@/components/admin/AdminPrimitives";
import { CurrencyFlag, FXPairFlags } from "@/components/ui/DopaminePrimitives";
import { PeriodSelectorPopover } from "@/components/shell/PeriodSelectorPopover";
import { MacroPublicationsHeader } from "@/components/dashboard/MacroPublicationsHeader";
import {
  SPRING_WEIGHTLESS,
  dispatchUndoToast,
  useIdempotentAction,
} from "@/lib/uxEngineeringStandards";
import { soundFX } from "@/lib/soundEngine";
import { AnimatedMetricValue, GhostWireframeDissolve } from "@/components/motion/AnimatedNumberAndMorphChart";
import { useLanguage } from "@/context/LanguageContext";
import { api, dashboardApi, finalScoreApi, macroDataApi } from "@/lib/api";
import { fxHistory, validateFxSnapshot, type FxSnapshot } from "@/lib/fxReservesLive";
import { equitySnapshotToPairMap, validateEquitySnapshot, type EquitySnapshot } from "@/lib/equityLive";
import { getCountryFrenchName } from "@/lib/macroFormatters";

type BackendMatrixCell = {
  value: number | string | null;
  status: string;
  source?: string;
};

type BackendMatrixRow = {
  country: string;
  iso?: string;
  cells: Record<string, BackendMatrixCell | null>;
};

type BackendMatrixResponse = {
  indicator?: string;
  slug?: string;
  months?: string[];
  rows?: BackendMatrixRow[];
  pair_rows?: EquitySnapshot["pair_rows"];
  freshness?: {
    status?: string;
    last_success_at?: string;
    latest_month?: string;
    latest_by_country?: Record<string, string>;
    error?: string;
  } | null;
};

type DataStatusItem = {
  indicator: string;
  slug: string;
  frequency: string;
  status: string;
  last_published: string | null;
  next_expected: string;
};

type ScraperStatusPayload = {
  scheduler_alive?: boolean;
  is_currently_running?: boolean;
  cron_active?: boolean;
  cron_preset?: string;
  last_scrape_time?: string;
  last_status?: string;
  next_scheduled_run?: string;
  next_scheduled_run_display?: string;
};

type DashboardKpisPayload = {
  active_fx_pairs?: number;
  up_bias?: number;
  down_bias?: number;
  neutral_bias?: number;
  active_indicators?: number;
  last_calculation?: string | null;
  last_data_update?: string | null;
};

type FeedRow = {
  id: string;
  type: "cpi" | "rates" | "gdp" | "reserves";
  ind: string;
  country: string;
  base: string;
  monthRaw: string;
  month: string;
  val: string;
  regime: string;
  src: string;
};

const CANONICAL_PAIR_NAMES = new Set([
  "EUR/USD", "EUR/GBP", "EUR/JPY", "EUR/CHF", "EUR/CAD", "EUR/AUD", "EUR/NZD",
  "GBP/USD", "GBP/JPY", "GBP/CHF", "GBP/CAD", "GBP/AUD", "GBP/NZD",
  "USD/JPY", "USD/CHF", "USD/CAD", "USD/AUD", "USD/NZD",
  "CHF/JPY", "CAD/JPY", "AUD/JPY", "NZD/JPY",
  "CAD/CHF", "AUD/CHF", "NZD/CHF", "AUD/CAD", "NZD/CAD", "AUD/NZD",
]);

const CANONICAL_PAIRS = PAIRS.filter((p) => CANONICAL_PAIR_NAMES.has(p.name));
const BAROMETER_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"] as const;

const COUNTRY_NAME_BY_BASE: Record<string, string> = {
  us: "USA",
  eu: "Euro Area",
  jp: "Japan",
  gb: "United Kingdom",
  au: "Australia",
  ca: "Canada",
  ch: "Switzerland",
  nz: "New Zealand",
  se: "Sweden",
  no: "Norway",
};

const DEFAULT_OFFICIAL_SOURCE: Record<string, Record<string, string>> = {
  cpi: {
    USA: "BLS",
    "United States": "BLS",
    "Euro Area": "Eurostat",
    Japan: "Statistics Bureau JP",
    "United Kingdom": "ONS",
    Australia: "ABS",
    Canada: "Statistics Canada",
    Switzerland: "FSO",
    "New Zealand": "Stats NZ",
    Sweden: "SCB",
    Norway: "SSB",
  },
  interest_rate: {
    USA: "Federal Reserve",
    "United States": "Federal Reserve",
    "Euro Area": "BCE / ECB",
    Japan: "Bank of Japan",
    "United Kingdom": "Bank of England",
    Australia: "RBA",
    Canada: "Bank of Canada",
    Switzerland: "SNB",
    "New Zealand": "RBNZ",
    Sweden: "Riksbank",
    Norway: "Norges Bank",
  },
  gdp: {
    USA: "BEA",
    "United States": "BEA",
    "Euro Area": "Eurostat",
    Japan: "Cabinet Office",
    "United Kingdom": "ONS",
    Australia: "ABS",
    Canada: "Statistics Canada",
    Switzerland: "SECO",
    "New Zealand": "Stats NZ",
    Sweden: "SCB",
    Norway: "SSB",
  },
  fx_reserves: {
    default: "IMF SDMX 3.0",
  },
};

const INDICATOR_SHORT_LABELS: Record<string, { fr: string; en: string }> = {
  GDP: { fr: "PIB", en: "GDP" },
  "Current Account": { fr: "BC", en: "CA" },
  CPI: { fr: "IPC", en: "CPI" },
  "Interest Rate": { fr: "Taux", en: "Rates" },
  "FX Reserves": { fr: "Rés. FX", en: "FX Res." },
  Equity: { fr: "Equity", en: "Equity" },
};

const PIPELINE_CONFIG = [
  { slug: "cpi", datasetKey: "CPI", fr: "IPC (Inflation)", en: "CPI (Inflation)", cycleFr: "Mensuel", cycleEn: "Monthly" },
  { slug: "interest_rate", datasetKey: "Interest Rate", fr: "Taux Directeurs", en: "Policy Rates", cycleFr: "Banques Centrales", cycleEn: "Central Banks" },
  { slug: "fx_reserves", datasetKey: "FX Reserves", fr: "Réserves FX", en: "FX Reserves", cycleFr: "FMI SDMX 3.0", cycleEn: "IMF SDMX 3.0" },
  { slug: "gdp", datasetKey: "GDP", fr: "PIB (Croissance)", en: "GDP (Growth)", cycleFr: "Trimestriel", cycleEn: "Quarterly" },
  { slug: "ca_gdp", datasetKey: "Current Account", fr: "Balance Courante", en: "Current Account", cycleFr: "Trimestriel", cycleEn: "Quarterly" },
  { slug: "equity", datasetKey: "Equity", fr: "Equity (Yahoo)", en: "Equity (Yahoo)", cycleFr: "Journalier / Mensuel", cycleEn: "Daily / Monthly" },
] as const;

function normalizeCountryMatch(apiCountry: string, apiIso: string | undefined, target: { country: string; base: string }): boolean {
  const cLower = apiCountry.trim().toLowerCase();
  const targetLower = target.country.toLowerCase();
  if (cLower === targetLower) return true;
  if (target.country === "USA" && (cLower === "united states" || cLower === "états-unis")) return true;
  if (target.country === "Euro Area" && (cLower === "zone euro" || cLower === "eurozone")) return true;
  if (target.country === "United Kingdom" && cLower === "royaume-uni") return true;
  if (apiIso && target.base === "us" && apiIso.toUpperCase() === "USD") return true;
  if (apiIso && target.base === "eu" && apiIso.toUpperCase() === "EUR") return true;
  if (apiIso && target.base === "gb" && apiIso.toUpperCase() === "GBP") return true;
  if (apiIso && target.base === "jp" && apiIso.toUpperCase() === "JPY") return true;
  if (apiIso && target.base === "au" && apiIso.toUpperCase() === "AUD") return true;
  if (apiIso && target.base === "ca" && apiIso.toUpperCase() === "CAD") return true;
  if (apiIso && target.base === "ch" && apiIso.toUpperCase() === "CHF") return true;
  if (apiIso && target.base === "nz" && apiIso.toUpperCase() === "NZD") return true;
  if (apiIso && target.base === "se" && apiIso.toUpperCase() === "SEK") return true;
  if (apiIso && target.base === "no" && apiIso.toUpperCase() === "NOK") return true;
  return false;
}

function formatPeriodLabel(ym: string, slug: string, lang: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!match) return ym;
  const year = Number(match[1]);
  const month = Number(match[2]);

  if (slug === "gdp" || slug === "ca_gdp") {
    const qMap: Record<number, number> = { 3: 1, 6: 2, 9: 3, 12: 4 };
    const q = qMap[month];
    if (q) {
      return `${lang === "fr" ? "T" : "Q"}${q} ${year}`;
    }
  }

  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatPublicationValue(raw: number, slug: string): string {
  if (slug === "fx_reserves") {
    if (Math.abs(raw) >= 1000) {
      return `$${(raw / 1000).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}B`;
    }
    return `$${Math.round(raw).toLocaleString("en-US")}M`;
  }
  if (slug === "interest_rate") {
    return `${raw.toFixed(2)}%`;
  }
  if (slug === "ca_gdp") {
    return `${raw >= 0 ? "+" : ""}${raw.toFixed(2)}%`;
  }
  if (slug === "equity") {
    return `${raw >= 0 ? "+" : ""}${(raw * 100).toFixed(2)}%`;
  }
  return `${raw.toFixed(1)}%`;
}

function inferRegimeLabel(val: number, slug: string, lang: string): string {
  if (slug === "cpi") {
    if (val > 2.5) return lang === "fr" ? "Au-dessus Cible" : "Above Target";
    if (val >= 1.7) return lang === "fr" ? "Proche Cible" : "Near Target";
    if (val >= 0) return lang === "fr" ? "Désinflation" : "Disinflation";
    return lang === "fr" ? "Déflation" : "Deflation";
  }
  if (slug === "interest_rate") {
    if (val >= 4.0) return lang === "fr" ? "Restrictif" : "Restrictive";
    if (val >= 2.5) return lang === "fr" ? "Modéré / Neutre" : "Moderate / Neutral";
    if (val > 0.5) return lang === "fr" ? "Accommodant" : "Accommodative";
    return lang === "fr" ? "Taux Bas / Zéro" : "Zero / Ultra-Low";
  }
  if (slug === "gdp") {
    if (val >= 2.0) return lang === "fr" ? "Expansion" : "Expansion";
    if (val >= 0.5) return lang === "fr" ? "Croissance Modérée" : "Moderate Growth";
    if (val >= 0) return lang === "fr" ? "Stagnation" : "Stagnation";
    return lang === "fr" ? "Contraction" : "Contraction";
  }
  if (val >= 500000) return lang === "fr" ? "Souverain Majeur" : "Major Reserve";
  if (val >= 100000) return lang === "fr" ? "Réserves Solides" : "Solid Reserves";
  return lang === "fr" ? "Liquidité Standard" : "Standard Liquidity";
}

function formatSourceLabel(rawSource: string | undefined, slug: string, country: string): string {
  const s = (rawSource || "").trim();
  const low = s.toLowerCase();
  if (low.includes("imf")) return "IMF SDMX 3.0";
  if (low.includes("tradingeconomics")) return "TradingEconomics";
  if (s && !low.includes("excel") && !low.includes("previous") && !low.includes("seeded") && !low.includes("migrated")) {
    return s;
  }
  return DEFAULT_OFFICIAL_SOURCE[slug]?.[country] || DEFAULT_OFFICIAL_SOURCE[slug]?.default || "Official Feed";
}

function formatUtcTimestamp(iso: string | undefined, lang: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d) + " UTC";
}

function findLatestPublishedFromMatrix(
  matrix: BackendMatrixResponse | undefined,
  datasetKey: string,
  targetYear: number
): {
  perCountry: Array<{ country: string; base: string; month: string; value: number; source?: string }>;
  latestMonth: string | null;
  coverageCount: number;
} {
  if (matrix?.rows && matrix.rows.length > 0) {
    const perCountry: Array<{ country: string; base: string; month: string; value: number; source?: string }> = [];
    for (const c of COUNTRIES) {
      const apiRow = matrix.rows.find((r) => normalizeCountryMatch(r.country, r.iso, c));
      if (!apiRow?.cells) continue;
      const publishedMonths = Object.entries(apiRow.cells)
        .filter(
          ([, cell]) =>
            cell &&
            cell.value !== null &&
            cell.value !== undefined &&
            Number.isFinite(Number(cell.value)) &&
            ["published", "revised"].includes(cell.status)
        )
        .sort(([a], [b]) => b.localeCompare(a));
      if (publishedMonths.length > 0) {
        const [month, cell] = publishedMonths[0];
        perCountry.push({
          country: c.country,
          base: c.base,
          month,
          value: Number(cell!.value),
          source: cell!.source,
        });
      }
    }
    const latestMonth = perCountry.reduce<string | null>(
      (max, item) => (max === null || item.month > max ? item.month : max),
      null
    );
    return { perCountry, latestMonth, coverageCount: perCountry.length };
  }

  // Verified local baseline fallback while API is loading or unavailable
  const fallbackYear = Math.min(targetYear, SYSTEM_CURRENT_YEAR);
  const months = getDisplayMonthsForYear(fallbackYear);
  const rows = getMacroMatrixData(datasetKey, fallbackYear);
  const perCountry: Array<{ country: string; base: string; month: string; value: number; source?: string }> = [];
  for (const r of rows) {
    for (let idx = months.length - 1; idx >= 0; idx--) {
      const cell = r.data[idx];
      if (cell && cell.status === "published" && cell.value !== null) {
        const num = Number(cell.value);
        if (Number.isFinite(num)) {
          perCountry.push({
            country: COUNTRY_NAME_BY_BASE[r.base] || r.country,
            base: r.base,
            month: months[idx],
            value: num,
          });
          break;
        }
      }
    }
  }
  const latestMonth = perCountry.reduce<string | null>(
    (max, item) => (max === null || item.month > max ? item.month : max),
    null
  );
  return { perCountry, latestMonth, coverageCount: perCountry.length };
}

export default function DashboardPage() {
  const { lang, t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentLiveMonthKey());
  const [activeFilterTab, setActiveFilterTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const selectedYear = Number(selectedMonth.slice(0, 4)) || SYSTEM_CURRENT_YEAR;
  const displayMonths = useMemo(() => getDisplayMonthsForYear(selectedYear), [selectedYear]);

  // Live backend queries across Dashboard, Macro Matrices, Final Score, and Scheduler telemetry
  const { data: liveBundle, refetch: refetchDashboard } = useQuery({
    queryKey: ["adminDashboardLiveBundle"],
    queryFn: async () => {
      const results = await Promise.allSettled([
        dashboardApi.kpis(),
        dashboardApi.dataStatus(),
        api.get("/settings/scraper-status"),
        macroDataApi.matrix("cpi"),
        macroDataApi.matrix("interest_rate"),
        macroDataApi.matrix("gdp"),
        macroDataApi.matrix("fx_reserves"),
        macroDataApi.matrix("ca_gdp"),
        macroDataApi.matrix("equity"),
        finalScoreApi.matrix(),
      ]);

      const unwrap = <T,>(idx: number): T | undefined => {
        const res = results[idx];
        return res.status === "fulfilled" ? (res.value.data as T) : undefined;
      };

      const fxRaw = unwrap<BackendMatrixResponse>(6);
      const eqRaw = unwrap<BackendMatrixResponse>(8);
      let validatedFx: FxSnapshot | null = null;
      let validatedEq: EquitySnapshot | null = null;
      try {
        if (fxRaw) validatedFx = validateFxSnapshot(fxRaw);
      } catch {
        validatedFx = null;
      }
      try {
        if (eqRaw) validatedEq = validateEquitySnapshot(eqRaw);
      } catch {
        validatedEq = null;
      }

      return {
        kpis: unwrap<DashboardKpisPayload>(0),
        dataStatus: unwrap<DataStatusItem[]>(1),
        scraperStatus: unwrap<ScraperStatusPayload>(2),
        matrices: {
          cpi: unwrap<BackendMatrixResponse>(3),
          interest_rate: unwrap<BackendMatrixResponse>(4),
          gdp: unwrap<BackendMatrixResponse>(5),
          fx_reserves: fxRaw,
          ca_gdp: unwrap<BackendMatrixResponse>(7),
          equity: eqRaw,
        },
        scoreMatrix: unwrap<{
          months?: string[];
          rows?: Array<{
            pair: string;
            cells: Record<string, { final_score: number | null; bias: string | null; is_complete: boolean } | null>;
          }>;
        }>(9),
        fxSnapshot: validatedFx,
        equitySnapshot: validatedEq,
        fetchedAt: new Date().toISOString(),
        failedCount: results.filter((r) => r.status === "rejected").length,
      };
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
  });

  const liveFxHistory = useMemo(
    () => (liveBundle?.fxSnapshot ? fxHistory(liveBundle.fxSnapshot, COUNTRIES) : undefined),
    [liveBundle?.fxSnapshot]
  );

  const liveEquityMap = useMemo(
    () => (liveBundle?.equitySnapshot ? equitySnapshotToPairMap(liveBundle.equitySnapshot) : undefined),
    [liveBundle?.equitySnapshot]
  );

  // 1. Dynamic 28-Pair Macro Scores (driven by live FX Reserves, live Equity, and 6-pillar differentials)
  const dynamicPairScores = useMemo(() => {
    const scoreRows = liveBundle?.scoreMatrix?.rows;
    return CANONICAL_PAIRS.map((pair) => {
      const driverBreakdown = INDICATORS.map((ind) => {
        const diffList = getCombinedDifferentialData(
          pair.name,
          ind,
          selectedYear,
          ind === "FX Reserves" ? liveFxHistory : undefined,
          ind === "Equity" ? liveEquityMap : undefined,
          displayMonths
        );
        const item = diffList.find((d) => d.month === selectedMonth);
        return {
          indicator: ind,
          rating: item?.rating ?? 0,
        };
      });

      const computedTotalScore = driverBreakdown.reduce((sum, item) => sum + item.rating, 0);
      let finalScorePct = Number(((computedTotalScore / 60) * 100).toFixed(1));
      let totalScore = computedTotalScore;

      // Prefer complete live backend FinalScore when present for the selected month
      const dbRow = scoreRows?.find((r) => r.pair === pair.name);
      const dbCell = dbRow?.cells?.[selectedMonth];
      if (dbCell && dbCell.is_complete && dbCell.final_score !== null && dbCell.final_score !== undefined) {
        finalScorePct = Number((dbCell.final_score * 10).toFixed(1));
        totalScore = Math.round(dbCell.final_score * 6);
      }

      const bias =
        finalScorePct >= 20.0
          ? "BULLISH"
          : finalScorePct <= -20.0
          ? "BEARISH"
          : "NEUTRAL";

      const topDrivers = [...driverBreakdown]
        .filter((d) => d.rating !== 0)
        .sort((a, b) => Math.abs(b.rating) - Math.abs(a.rating))
        .slice(0, 2);

      return {
        ...pair,
        totalScore,
        finalScorePct,
        bias,
        topDrivers,
      };
    });
  }, [selectedYear, selectedMonth, displayMonths, liveFxHistory, liveEquityMap, liveBundle?.scoreMatrix?.rows]);

  // 2. Dynamic Bias Breakdown across the 28 canonical pairs
  const biasDistribution = useMemo(() => {
    let bullish = 0;
    let neutral = 0;
    let bearish = 0;
    dynamicPairScores.forEach((p) => {
      if (p.bias === "BULLISH") bullish++;
      else if (p.bias === "BEARISH") bearish++;
      else neutral++;
    });
    const total = dynamicPairScores.length || 28;
    return {
      bullish,
      neutral,
      bearish,
      total,
      bullishPct: Math.round((bullish / total) * 100),
      neutralPct: Math.round((neutral / total) * 100),
      bearishPct: Math.round((bearish / total) * 100),
    };
  }, [dynamicPairScores]);

  // 3. Dynamic G10 Sovereign Currency Strength Barometer (aggregated from all 28 pairs)
  const currencyStrengthRanking = useMemo(() => {
    const totals: Record<string, { sum: number; count: number }> = {};
    for (const c of BAROMETER_CURRENCIES) {
      totals[c] = { sum: 0, count: 0 };
    }
    for (const p of dynamicPairScores) {
      if (totals[p.baseName]) {
        totals[p.baseName].sum += p.finalScorePct;
        totals[p.baseName].count += 1;
      }
      if (totals[p.quoteName]) {
        totals[p.quoteName].sum -= p.finalScorePct;
        totals[p.quoteName].count += 1;
      }
    }

    return BAROMETER_CURRENCIES.map((code) => {
      const entry = totals[code];
      const avg = entry.count > 0 ? Number((entry.sum / entry.count).toFixed(1)) : 0;
      const stance =
        avg >= 10
          ? "HAWKISH"
          : avg > 0
          ? lang === "fr"
            ? "MODÉRÉ +"
            : "MILD +"
          : avg <= -10
          ? "DOVISH"
          : avg < 0
          ? lang === "fr"
            ? "MODÉRÉ -"
            : "MILD -"
          : "NEUTRE";
      return {
        code,
        score: avg,
        stance,
      };
    })
      .sort((a, b) => b.score - a.score)
      .map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));
  }, [dynamicPairScores, lang]);

  // 4. Dynamic Top 4 High-Conviction Macro Opportunities from live 28-pair scores
  const highConvictionPairs = useMemo(() => {
    return [...dynamicPairScores]
      .sort((a, b) => Math.abs(b.finalScorePct) - Math.abs(a.finalScorePct) || Math.abs(b.totalScore) - Math.abs(a.totalScore))
      .slice(0, 4)
      .map((p) => {
        const driverText =
          p.topDrivers.length > 0
            ? p.topDrivers
                .map((d) => {
                  const lbl = INDICATOR_SHORT_LABELS[d.indicator]?.[lang === "fr" ? "fr" : "en"] || d.indicator;
                  return `${lbl} (${d.rating > 0 ? `+${d.rating}` : d.rating})`;
                })
                .join(" • ")
            : lang === "fr"
            ? "En attente de publications du mois"
            : "Awaiting monthly releases";
        return {
          pair: p.name,
          scorePct: `${p.finalScorePct > 0 ? "+" : ""}${p.finalScorePct.toFixed(1)}%`,
          rating: `${p.totalScore > 0 ? "+" : ""}${p.totalScore} / 60`,
          bias: p.bias,
          rationale: `${lang === "fr" ? "Moteurs" : "Drivers"} : ${driverText}`,
          base: p.baseName,
          quote: p.quoteName,
        };
      });
  }, [dynamicPairScores, lang]);

  // 5. Real Latest Published Macro Releases Table (live DB matrices with clean verified baseline fallback)
  const latestPublishedFeed = useMemo(() => {
    const specs: Array<{
      slug: "cpi" | "interest_rate" | "gdp" | "fx_reserves";
      type: FeedRow["type"];
      datasetKey: string;
      indFr: string;
      indEn: string;
    }> = [
      { slug: "cpi", type: "cpi", datasetKey: "CPI", indFr: "IPC (CPI)", indEn: "CPI (YoY)" },
      { slug: "interest_rate", type: "rates", datasetKey: "Interest Rate", indFr: "Taux Directeur", indEn: "Policy Rate" },
      { slug: "gdp", type: "gdp", datasetKey: "GDP", indFr: "PIB (GDP)", indEn: "GDP Growth" },
      { slug: "fx_reserves", type: "reserves", datasetKey: "FX Reserves", indFr: "Réserves FX", indEn: "FX Reserves" },
    ];

    const byType: Record<FeedRow["type"], FeedRow[]> = {
      cpi: [],
      rates: [],
      gdp: [],
      reserves: [],
    };

    for (const spec of specs) {
      const matrix = liveBundle?.matrices?.[spec.slug];
      const extracted = findLatestPublishedFromMatrix(matrix, spec.datasetKey, selectedYear);
      const rows: FeedRow[] = extracted.perCountry
        .sort((a, b) => b.month.localeCompare(a.month) || a.country.localeCompare(b.country))
        .map((item) => ({
          id: `${spec.slug}_${item.base}_${item.month}`,
          type: spec.type,
          ind: lang === "fr" ? spec.indFr : spec.indEn,
          country: lang === "fr" ? getCountryFrenchName(item.country) : item.country,
          base: item.base.toUpperCase(),
          monthRaw: item.month,
          month: formatPeriodLabel(item.month, spec.slug, lang),
          val: formatPublicationValue(item.value, spec.slug),
          regime: inferRegimeLabel(item.value, spec.slug, lang),
          src: formatSourceLabel(item.source, spec.slug, item.country),
        }));
      byType[spec.type] = rows;
    }

    return byType;
  }, [liveBundle?.matrices, selectedYear, lang]);

  const filteredFeed = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const allCombined =
      activeFilterTab === "all" && !q
        ? [
            ...latestPublishedFeed.rates.slice(0, 3),
            ...latestPublishedFeed.cpi.slice(0, 3),
            ...latestPublishedFeed.reserves.slice(0, 3),
            ...latestPublishedFeed.gdp.slice(0, 3),
          ].sort((a, b) => b.monthRaw.localeCompare(a.monthRaw))
        : activeFilterTab === "all"
        ? [
            ...latestPublishedFeed.rates,
            ...latestPublishedFeed.cpi,
            ...latestPublishedFeed.reserves,
            ...latestPublishedFeed.gdp,
          ].sort((a, b) => b.monthRaw.localeCompare(a.monthRaw))
        : latestPublishedFeed[activeFilterTab as FeedRow["type"]] || [];

    if (!q) return allCombined;
    return allCombined.filter(
      (row) =>
        row.ind.toLowerCase().includes(q) ||
        row.country.toLowerCase().includes(q) ||
        row.base.toLowerCase().includes(q) ||
        row.src.toLowerCase().includes(q) ||
        row.regime.toLowerCase().includes(q) ||
        row.month.toLowerCase().includes(q)
    );
  }, [latestPublishedFeed, activeFilterTab, searchQuery]);

  // 6. Real Pipeline Health Panel (driven by backend data-status, matrix freshness, and scraper-status)
  const pipelineHealth = useMemo(() => {
    const dataStatusList = liveBundle?.dataStatus || [];
    const scraper = liveBundle?.scraperStatus;
    const nextRunShort = scraper?.next_scheduled_run_display
      ? scraper.next_scheduled_run_display
      : null;

    const items = PIPELINE_CONFIG.map((cfg) => {
      const ds = dataStatusList.find((d) => d.slug === cfg.slug);
      const matrix = liveBundle?.matrices?.[cfg.slug as keyof typeof liveBundle.matrices];

      let lastPeriod: string = ds?.last_published || "—";
      let detailRight: string = lang === "fr" ? cfg.cycleFr : cfg.cycleEn;
      let statusLabel: string = lang === "fr" ? "À jour" : "Updated";
      let tone: "emerald" | "amber" | "rose" | "sky" = "emerald";

      if (cfg.slug === "equity") {
        const eqPairs = matrix?.pair_rows || [];
        let latestEqMonth: string | null = matrix?.freshness?.latest_month || null;
        let coveredPairs = 0;
        for (const pr of eqPairs) {
          const validMonths = Object.entries(pr.cells || {})
            .filter(([, c]) => c && c.final_change !== null && c.final_change !== undefined)
            .map(([m]) => m)
            .sort();
          if (validMonths.length > 0) {
            coveredPairs += 1;
            const mMax = validMonths[validMonths.length - 1];
            if (!latestEqMonth || mMax > latestEqMonth) latestEqMonth = mMax;
          }
        }
        if (latestEqMonth) lastPeriod = formatPeriodLabel(latestEqMonth, "equity", lang);
        const eqErr = matrix?.freshness?.status === "ERROR";
        if (eqErr) {
          statusLabel = lang === "fr" ? "Erreur Yahoo" : "Yahoo Error";
          tone = "rose";
        } else if (ds?.status === "Pending") {
          statusLabel = lang === "fr" ? "En attente" : "Pending";
          tone = "amber";
        } else {
          statusLabel = lang === "fr" ? "Yahoo Live" : "Yahoo Live";
          tone = "emerald";
        }
        const syncedFmt = formatUtcTimestamp(matrix?.freshness?.last_success_at, lang);
        detailRight = syncedFmt || (coveredPairs > 0 ? `${coveredPairs}/28 ${lang === "fr" ? "paires" : "pairs"}` : nextRunShort || detailRight);
      } else {
        const extracted = findLatestPublishedFromMatrix(matrix, cfg.datasetKey, selectedYear);
        if (extracted.latestMonth) {
          lastPeriod = formatPeriodLabel(extracted.latestMonth, cfg.slug, lang);
        }
        if (cfg.slug === "fx_reserves" && matrix?.freshness?.status === "ERROR") {
          statusLabel = lang === "fr" ? "Erreur FMI" : "IMF Error";
          tone = "rose";
        } else if (ds?.status === "Missing") {
          statusLabel = lang === "fr" ? "Manquant" : "Missing";
          tone = "rose";
        } else if (ds?.status === "Pending") {
          statusLabel = lang === "fr" ? "En attente" : "Pending";
          tone = "amber";
        } else if (ds?.status === "Manual") {
          statusLabel = lang === "fr" ? "Manuel" : "Manual";
          tone = "sky";
        } else {
          statusLabel = cfg.slug === "fx_reserves" ? "FMI Live" : lang === "fr" ? "Synchronisé" : "Synchronized";
          tone = "emerald";
        }

        if (cfg.slug === "fx_reserves") {
          const syncedFmt = formatUtcTimestamp(matrix?.freshness?.last_success_at, lang);
          detailRight = syncedFmt || `${extracted.coverageCount}/10 ${lang === "fr" ? "pays" : "countries"}`;
        } else if (nextRunShort) {
          detailRight = `${lang === "fr" ? "Cron" : "Next"}: ${nextRunShort}`;
        } else {
          detailRight = `${extracted.coverageCount}/10 ${lang === "fr" ? "pays" : "countries"}`;
        }
      }

      return {
        slug: cfg.slug,
        ind: lang === "fr" ? cfg.fr : cfg.en,
        last: lastPeriod,
        status: statusLabel,
        tone,
        detailRight,
      };
    });

    const healthyCount = items.filter((i) => i.tone === "emerald" || i.tone === "sky").length;
    const hasError = items.some((i) => i.tone === "rose");
    const activePct = Math.round((healthyCount / items.length) * 100);

    return {
      items,
      healthyCount,
      totalCount: items.length,
      activePct,
      hasError,
      cronPreset: scraper?.cron_preset || "4hours",
      cronActive: scraper?.cron_active ?? true,
      lastScrapeTime: scraper?.last_scrape_time,
    };
  }, [liveBundle?.dataStatus, liveBundle?.matrices, liveBundle?.scraperStatus, selectedYear, lang]);

  const activePairsCount = liveBundle?.kpis?.active_fx_pairs ?? CANONICAL_PAIRS.length;
  const majorsCount = useMemo(
    () => CANONICAL_PAIRS.filter((p) => p.baseName === "USD" || p.quoteName === "USD").length,
    []
  );
  const crossesCount = Math.max(0, activePairsCount - majorsCount);
  const activeIndicatorsCount = liveBundle?.kpis?.active_indicators ?? INDICATORS.length;

  // Idempotent Live Sync Action — refreshes real backend data queries
  const executeSync = useIdempotentAction(async () => {
    soundFX.playPop(1);
    setIsRefreshing(true);
    setRefreshNotice(null);
    setRefreshError(null);
    try {
      await queryClient.invalidateQueries({ queryKey: ["adminDashboardLiveBundle"] });
      const res = await refetchDashboard();
      if (res.error) {
        throw res.error;
      }
      soundFX.playChime();
      const msg =
        lang === "fr"
          ? `Données synchronisées depuis l'API (${pipelineHealth.healthyCount}/${pipelineHealth.totalCount} pipelines actifs).`
          : `Synchronized live backend data (${pipelineHealth.healthyCount}/${pipelineHealth.totalCount} active pipelines).`;
      setRefreshNotice(msg);
      dispatchUndoToast(msg, () => {
        setRefreshNotice(null);
      });
      setTimeout(() => setRefreshNotice(null), 4000);
    } catch (err) {
      setRefreshError(
        err instanceof Error
          ? err.message
          : lang === "fr"
          ? "Échec de synchronisation avec le serveur backend."
          : "Failed to synchronize with backend server."
      );
    } finally {
      setIsRefreshing(false);
    }
  });

  const triggerCommandPalette = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-command-palette"));
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-3.5 sm:p-5 lg:p-6 xl:p-8 flex flex-col text-white">
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 1. UNIFIED ADMIN PAGE HEADER                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AdminPageHeader
        eyebrow={t("dash.eyebrow")}
        badgeText={t("dash.badge")}
        title={t("dash.title")}
        searchPlaceholder={t("dash.search_placeholder")}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchClick={triggerCommandPalette}
        rightActions={
          <>
            {/* Bespoke Institutional Period Popover Selector */}
            <PeriodSelectorPopover
              selected={selectedMonth}
              onSelect={setSelectedMonth}
              onSyncMacro={executeSync}
              align="left"
            />

            {/* UTC Telemetry Clock Pill */}
            <div className="hidden lg:flex items-center gap-2 h-10 px-3.5 rounded-full bg-[#10131A] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] text-xs text-slate-300">
              <ClockIcon size={14} className="text-[#D4FF00] shrink-0" />
              <span className="font-sans font-medium text-slate-300" suppressHydrationWarning>
                {new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", timeZone: "UTC" }).format(new Date())} •{" "}
                <span className="font-mono tabular-nums">{getCurrentLiveMonthKey()}</span> UTC
              </span>
            </div>

            {/* Sync Engine Button with Hit Slop */}
            <button
              onClick={() => executeSync()}
              disabled={isRefreshing}
              className={clsx(
                "relative h-10 w-10 rounded-full border border-white/[0.08] bg-[#10131A] flex items-center justify-center transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] after:absolute after:-inset-2.5 after:content-['']",
                isRefreshing
                  ? "text-[#D4FF00] border-[#D4FF00]/40"
                  : "text-slate-400 hover:text-white hover:border-white/20"
              )}
              title={lang === "fr" ? "Actualiser les données live" : "Refresh live data"}
              aria-label={lang === "fr" ? "Actualiser les données live" : "Refresh live data"}
            >
              <SyncIcon
                size={14}
                className={clsx(isRefreshing && "animate-spin text-[#D4FF00]")}
              />
            </button>
          </>
        }
      />

      {/* System Refresh Banners */}
      <AnimatePresence>
        {(refreshNotice || refreshError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={SPRING_WEIGHTLESS}
            className={clsx(
              "w-full flex items-center justify-between p-3.5 rounded-2xl text-xs shadow-2xl mb-5 border",
              refreshError
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            )}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircleIcon size={16} className={refreshError ? "text-rose-400" : "text-emerald-400"} />
              <span className="font-sans font-medium">{refreshError || refreshNotice}</span>
            </div>
            <span className={clsx("font-mono text-xs font-bold tabular-nums", refreshError ? "text-rose-400" : "text-[#D4FF00]")}>
              {refreshError ? "ERR" : "200 OK"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 2. TOP KPI ROW                                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-5">
        {/* KPI 1: Active FX Pairs */}
        <CatalogueKPICard
          title={t("dash.kpi_active_pairs")}
          value={String(activePairsCount)}
          numericValue={activePairsCount}
          decimals={0}
          unit={lang === "fr" ? "Couverture 100%" : "100% Coverage"}
          subtitle={
            <span className="font-sans font-medium text-xs text-slate-300">
              <span className="font-mono font-bold tabular-nums">{majorsCount}</span> {lang === "fr" ? "Majeures" : "Majors"} •{" "}
              <span className="font-mono font-bold tabular-nums">{crossesCount}</span> {lang === "fr" ? "Croisées" : "Crosses"}
            </span>
          }
          variant="lime"
          icon={<StackIcon size={16} className="text-[#D4FF00]" />}
          bars={[50, 75, 60, 95]}
          className="h-[115px] sm:h-[132px]"
        />

        {/* KPI 2: Macro Bias Distribution */}
        <CatalogueKPICard
          title={t("dash.kpi_global_bias")}
          variant="emerald"
          icon={<PulseIcon size={16} className="text-emerald-400" />}
          className="h-[115px] sm:h-[132px]"
          customHero={
            <div className="flex flex-col gap-1.5 my-0.5 sm:my-1">
              <div className="flex items-baseline justify-between">
                <span className="text-xl sm:text-[28px] leading-none font-mono font-extrabold text-[#F8FAFC] tracking-tight tabular-nums flex items-baseline">
                  <AnimatedMetricValue value={biasDistribution.neutralPct} decimals={0} suffix="%" />
                  <span className="font-sans text-xs text-slate-400 font-normal ml-1.5">
                    {t("regime.neutral")}
                  </span>
                </span>
                <span className="text-[10px] sm:text-[11px] font-mono tabular-nums text-slate-400">
                  <span className="text-emerald-400 font-bold">
                    +{biasDistribution.bullish}
                  </span>{" "}
                  / {biasDistribution.neutral} /{" "}
                  <span className="text-rose-400 font-bold">
                    -{biasDistribution.bearish}
                  </span>
                </span>
              </div>
              <div className="w-full h-1.5 sm:h-2 rounded-full overflow-hidden flex bg-white/[0.06] p-0.5 border border-white/[0.08]">
                <div
                  style={{ width: `${biasDistribution.bullishPct}%` }}
                  className="h-full bg-emerald-400 rounded-l-full shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-500"
                />
                <div
                  style={{ width: `${biasDistribution.neutralPct}%` }}
                  className="h-full bg-slate-400 transition-all duration-500"
                />
                <div
                  style={{ width: `${biasDistribution.bearishPct}%` }}
                  className="h-full bg-rose-400 rounded-r-full shadow-[0_0_8px_rgba(244,63,94,0.5)] transition-all duration-500"
                />
              </div>
            </div>
          }
          customSubtitle={
            <span className="font-sans font-medium text-xs text-slate-300 whitespace-nowrap">
              <span className="font-mono tabular-nums">{biasDistribution.bullishPct}%</span> {t("regime.bullish")} •{" "}
              <span className="font-mono tabular-nums">{biasDistribution.bearishPct}%</span> {t("regime.bearish")}
            </span>
          }
          customRightFooter={<div />}
        />

        {/* KPI 3: Active Indicators */}
        <CatalogueKPICard
          title={lang === "fr" ? "INDICATEURS ACTIFS" : "ACTIVE PILLARS"}
          value={`${pipelineHealth.healthyCount} / ${activeIndicatorsCount}`}
          unit={lang === "fr" ? "Pipelines" : "Pipelines"}
          variant="slate"
          icon={<CheckCircleIcon size={16} className="text-slate-300" />}
          className="h-[115px] sm:h-[132px]"
          customSubtitle={
            <div className="flex items-center gap-[3px] whitespace-nowrap overflow-visible pt-0.5 min-w-0 flex-1">
              {INDICATORS.map((ind) => (
                <span
                  key={ind}
                  className="px-1.5 py-0.5 rounded-[5px] bg-white/[0.04] border border-white/[0.06] font-sans font-medium text-[9.5px] text-slate-300 tracking-tight shrink-0"
                >
                  {INDICATOR_SHORT_LABELS[ind]?.[lang === "fr" ? "fr" : "en"] || ind}
                </span>
              ))}
            </div>
          }
          bars={[60, 70, 80, 100]}
        />

        {/* KPI 4: Engine Status */}
        <CatalogueKPICard
          title={t("dash.kpi_engine_status")}
          value={`${pipelineHealth.activePct}%`}
          numericValue={pipelineHealth.activePct}
          decimals={0}
          unit={
            pipelineHealth.hasError
              ? lang === "fr"
                ? "Attention requise"
                : "Needs attention"
              : lang === "fr"
              ? "Synchronisé"
              : "Synchronized"
          }
          subtitle={
            <span className="font-sans font-medium text-xs text-slate-400">
              {lang === "fr" ? "Période active :" : "Active period:"}{" "}
              <span className="font-mono tabular-nums">{selectedMonth}</span>
            </span>
          }
          variant={pipelineHealth.hasError ? "rose" : "emerald"}
          icon={<ShieldCheckIcon size={16} className={pipelineHealth.hasError ? "text-rose-400" : "text-emerald-400"} />}
          bars={[80, 85, 90, Math.max(25, pipelineHealth.activePct)]}
          className="h-[115px] sm:h-[132px]"
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 3. G10 SOVEREIGN CURRENCY STRENGTH BAROMETER                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <GhostWireframeDissolve isRefreshing={isRefreshing}>
      <section className="rounded-[24px] bg-[#101218] border border-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_20px_40px_-15px_rgba(0,0,0,0.7)] p-4 sm:p-6 mb-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/[0.05] pb-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <FlameIcon size={18} className="text-[#D4FF00]" />
              <h2 className="font-display text-sm sm:text-base font-bold tracking-[-0.025em] text-white [text-wrap:balance]">
                {lang === "fr"
                  ? "Baromètre Souverain de Force Relative G10"
                  : "G10 Sovereign Relative Strength Barometer"}
              </h2>
            </div>
            <p className="font-sans text-[13px] text-slate-400 [text-wrap:pretty]">
              {lang === "fr"
                ? "Indice de momentum macroéconomique calculé sur la matrice 6-piliers"
                : "Macro momentum index computed from the 6-pillar matrix"}{" "}
              (<span className="font-mono tabular-nums">{selectedMonth}</span>)
            </p>
          </div>
          <div className="flex items-center gap-3 font-sans text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {lang === "fr" ? "Biais Haussier" : "Bullish Tilt"}
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              {lang === "fr" ? "Biais Baissier" : "Bearish Tilt"}
            </span>
          </div>
        </div>

        {/* Currency Pods */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-2.5 pb-2 no-scrollbar sm:grid sm:grid-cols-4 xl:grid-cols-8 sm:gap-3 sm:overflow-visible mt-4 sm:mt-5">
          {currencyStrengthRanking.map((curr) => {
            const isPos = curr.score > 0;
            const isZero = curr.score === 0;
            const podWash: WashVariant = isPos ? "emerald" : isZero ? "slate" : "rose";
            const washStyle = WASH_STYLES[podWash];

            return (
              <div
                key={curr.code}
                onMouseEnter={() => soundFX.playTick()}
                className={`min-w-[125px] snap-start shrink-0 lg:min-w-0 flex flex-col justify-between p-3.5 rounded-[18px] bg-[#0A0B0F] ${washStyle.bg} border border-white/[0.06] ${washStyle.borderTop} shadow-md transition-all duration-200 ease-out hover:border-white/[0.14] hover:bg-[#12151C] group`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] font-bold text-slate-400 tabular-nums">
                    #{curr.rank}
                  </span>
                  <span
                    className={clsx(
                      "font-mono font-bold text-[11px] px-2 py-0.5 rounded-full border tabular-nums",
                      isPos
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : isZero
                        ? "bg-slate-400/10 text-slate-400 border-slate-400/20"
                        : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    )}
                  >
                    {curr.score > 0 ? `+${curr.score}%` : `${curr.score}%`}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2.5">
                  <CurrencyFlag currency={curr.code} size="md" />
                  <span className="font-display font-bold text-sm text-white group-hover:text-[#D4FF00] transition-colors tracking-tight">
                    {curr.code}
                  </span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-2.5">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all duration-500",
                      isPos
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : isZero
                        ? "bg-slate-400"
                        : "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                    )}
                    style={{
                      width: `${Math.min(100, Math.max(18, Math.abs(curr.score) * 4))}%`,
                    }}
                  />
                </div>

                <span
                  className={clsx(
                    "font-sans text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border text-center whitespace-nowrap",
                    isPos
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : isZero
                      ? "bg-slate-400/10 text-slate-400 border-slate-400/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  )}
                >
                  {curr.stance}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 4. HIGH-CONVICTION SOVEREIGN OPPORTUNITIES                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <SparklesFillIcon size={18} className="text-[#D4FF00]" />
            <h2 className="font-display text-sm sm:text-base font-bold tracking-[-0.025em] text-white [text-wrap:balance]">
              {lang === "fr" ? "Opportunités Souveraines à Haute Conviction" : "High-Conviction Sovereign Opportunities"} (
              <span className="font-mono tabular-nums">{selectedMonth}</span>)
            </h2>
          </div>
          <Link
            href="/admin/final-score"
            className="font-sans text-xs font-semibold text-[#D4FF00] hover:underline flex items-center gap-1 relative after:absolute after:-inset-1.5 after:content-['']"
          >
            {lang === "fr" ? "Explorer la Matrice 28 Paires" : "Explore 28-Pair Matrix"} <ArrowRightIcon size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
          {highConvictionPairs.map((pair) => {
            const isPos = !pair.scorePct.startsWith("-") && pair.scorePct !== "0.0%";
            const isNeutral = pair.bias === "NEUTRAL";
            const washStyle = WASH_STYLES[isNeutral ? "slate" : isPos ? "emerald" : "rose"];

            return (
              <motion.div
                key={pair.pair}
                whileHover={{ y: -4, rotateX: 1.8, rotateY: -1.2, scale: 1.012 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                onMouseEnter={() => soundFX.playTick()}
                className="h-full"
              >
                <Link
                  href="/admin/final-score"
                  className={`h-full rounded-[22px] p-5 bg-[#101218] ${washStyle.bg} border border-white/[0.06] ${washStyle.borderTop} shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_16px_32px_-12px_rgba(0,0,0,0.6)] flex flex-col justify-between gap-3 group transition-all duration-200 ease-out hover:border-white/[0.14] hover:bg-[#12151C]`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FXPairFlags pair={pair.pair} size="sm" />
                      <span className="font-display font-bold text-base text-white group-hover:text-[#D4FF00] transition-colors tracking-tight">
                        {pair.pair}
                      </span>
                    </div>
                    <span
                      className={clsx(
                        "font-sans text-[9px] font-bold px-2 py-0.5 rounded-full border",
                        pair.bias === "BULLISH"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : pair.bias === "BEARISH"
                          ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                          : "bg-white/[0.06] text-slate-300 border-white/[0.12]"
                      )}
                    >
                      {pair.bias === "BULLISH"
                        ? lang === "fr"
                          ? "ACHETEUR"
                          : "BULLISH"
                        : pair.bias === "BEARISH"
                        ? lang === "fr"
                          ? "VENDEUR"
                          : "BEARISH"
                        : lang === "fr"
                        ? "NEUTRE"
                        : "NEUTRAL"}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mt-1">
                    <span
                      className={clsx(
                        "text-2xl font-mono font-extrabold tracking-tight tabular-nums",
                        isPos ? "text-emerald-400" : pair.scorePct.startsWith("-") ? "text-rose-400" : "text-slate-300"
                      )}
                    >
                      {pair.scorePct}
                    </span>
                    <span className="font-sans text-xs text-slate-400">
                      Score : <span className="font-mono tabular-nums">{pair.rating}</span>
                    </span>
                  </div>

                  <div className="min-h-[34px] flex items-center">
                    <p className="font-sans text-xs text-slate-400 leading-relaxed line-clamp-2 [text-wrap:pretty]">
                      {pair.rationale}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-xs font-sans">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      {lang === "fr" ? "Biais 6-Piliers" : "6-Pillar Bias"}
                    </span>
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 font-semibold transition-transform group-hover:translate-x-1",
                        isPos ? "text-emerald-400" : pair.scorePct.startsWith("-") ? "text-rose-400" : "text-slate-300"
                      )}
                    >
                      {lang === "fr" ? "Inspecter" : "Inspect"} <ArrowRightIcon size={13} />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 5. PUBLISHED MACRO DATA FEED & PIPELINE TELEMETRY                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="w-full flex flex-col lg:flex-row gap-5">
        {/* Left Column: Live Published Macro Feed */}
        <section className="flex-[2] rounded-[24px] bg-[#101218] border border-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_20px_40px_-15px_rgba(0,0,0,0.7)] p-4 sm:p-6 flex flex-col gap-4">
          <MacroPublicationsHeader
            activeFilter={activeFilterTab}
            onSelectFilter={setActiveFilterTab}
          />

          <div className="overflow-x-auto w-full no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[580px]">
              <thead>
                <tr className="border-b border-white/[0.05] font-sans text-[11px] font-semibold uppercase tracking-wider text-slate-400 h-9">
                  <th className="pb-2 px-3">{lang === "fr" ? "Indicateur" : "Indicator"}</th>
                  <th className="pb-2 px-3">{lang === "fr" ? "Entité Souveraine" : "Sovereign"}</th>
                  <th className="pb-2 px-3">{lang === "fr" ? "Période" : "Period"}</th>
                  <th className="pb-2 px-3">{lang === "fr" ? "Valeur Officielle" : "Official Value"}</th>
                  <th className="pb-2 px-3">{lang === "fr" ? "Régime Économique" : "Economic Regime"}</th>
                  <th className="pb-2 px-3 text-right">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03] text-xs">
                {filteredFeed.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center font-mono text-xs text-slate-400">
                      {lang === "fr"
                        ? "Aucune publication ne correspond à votre recherche."
                        : "No matching macro publication found."}
                    </td>
                  </tr>
                ) : (
                  filteredFeed.map((row) => (
                    <tr key={row.id} className="hover:bg-white/[0.02] transition-colors h-11">
                      <td className="px-3 font-sans font-semibold text-white whitespace-nowrap">
                        {row.ind}
                      </td>
                      <td className="px-3 font-sans text-slate-300">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <CurrencyFlag currency={row.base} size="sm" />
                          <span>{row.country}</span>
                        </div>
                      </td>
                      <td className="px-3 font-mono tabular-nums text-slate-400 whitespace-nowrap">
                        {row.month}
                      </td>
                      <td className="px-3 font-mono font-bold tabular-nums text-white whitespace-nowrap">
                        <span className="rounded-full bg-white/[0.04] border border-white/[0.06] px-2.5 py-0.5">
                          {row.val}
                        </span>
                      </td>
                      <td className="px-3 font-sans text-slate-300 whitespace-nowrap">
                        {row.regime}
                      </td>
                      <td className="px-3 text-right font-sans text-slate-400 whitespace-nowrap font-medium">
                        {row.src}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between font-sans text-xs text-slate-400 pt-3 border-t border-white/[0.05] flex-wrap gap-2">
            <span>
              {lang === "fr" ? "Affichage de" : "Showing"}{" "}
              <span className="font-mono tabular-nums text-white font-semibold">{filteredFeed.length}</span>{" "}
              {lang === "fr"
                ? "dernières publications officielles par souverain"
                : "latest official releases by sovereign"}
            </span>
            <Link
              href="/admin/macro-data"
              className="text-[#D4FF00] hover:underline flex items-center gap-1 font-semibold relative after:absolute after:-inset-1.5 after:content-['']"
            >
              {lang === "fr" ? "Matrice Complète" : "Full Matrix"} <ArrowRightIcon size={13} />
            </Link>
          </div>
        </section>

        {/* Right Column: Live Pipeline Health */}
        <section className="flex-[1.1] rounded-[24px] bg-[#101218] border border-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_20px_40px_-15px_rgba(0,0,0,0.7)] p-4 sm:p-6 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.05] gap-2">
              <div>
                <h2 className="font-display text-base font-bold tracking-[-0.025em] text-white [text-wrap:balance]">
                  {lang === "fr" ? "Santé du Pipeline d'Ingestion" : "Ingestion Pipeline Health"}
                </h2>
                <p className="font-sans text-xs text-slate-400 mt-0.5 [text-wrap:pretty]">
                  {pipelineHealth.lastScrapeTime
                    ? `${lang === "fr" ? "Dernier cycle" : "Last run"} : ${pipelineHealth.lastScrapeTime} (${pipelineHealth.cronPreset})`
                    : lang === "fr"
                    ? "Télémétrie d'ingestion automatique"
                    : "Automated ingestion telemetry"}
                </p>
              </div>
              <span
                className={clsx(
                  "rounded-full border font-mono text-[10px] font-bold px-2.5 py-0.5 whitespace-nowrap tabular-nums",
                  pipelineHealth.hasError
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                    : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                )}
              >
                {pipelineHealth.activePct}% {pipelineHealth.cronActive ? "ACTIF" : "PAUSE"}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {pipelineHealth.items.map((pipe) => (
                <div
                  key={pipe.slug}
                  className="flex items-center justify-between p-2.5 px-3 rounded-[16px] bg-[#0A0B0F] border border-white/[0.05] text-xs gap-2"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-sans font-semibold text-white text-xs truncate">{pipe.ind}</span>
                    <span className="font-sans text-[11px] text-slate-400">
                      {lang === "fr" ? "Dernier" : "Latest"} : <span className="font-mono tabular-nums">{pipe.last}</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span
                      className={clsx(
                        "font-sans text-[10px] font-semibold",
                        pipe.tone === "emerald"
                          ? "text-emerald-400"
                          : pipe.tone === "amber"
                          ? "text-amber-400"
                          : pipe.tone === "sky"
                          ? "text-sky-400"
                          : "text-rose-400"
                      )}
                    >
                      {pipe.status}
                    </span>
                    <span className="font-sans text-[10px] text-slate-500 font-mono tabular-nums">
                      {pipe.detailRight}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/admin/settings"
            className="relative w-full h-11 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white font-sans text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] after:absolute after:-inset-1.5 after:content-['']"
          >
            <SlidersIcon size={15} className="text-[#D4FF00]" />
            <span>{lang === "fr" ? "Configurer Scraper & Crontab" : "Configure Scraper & Cron"}</span>
          </Link>
        </section>
      </div>
      </GhostWireframeDissolve>
    </div>
  );
}
