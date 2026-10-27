"use client";

import { 
  PAIRS, 
  INDICATORS, 
  getCombinedDifferentialData, 
  SYSTEM_CURRENT_YEAR, 
  SYSTEM_CURRENT_MONTH,
  MASTER_MACRO_DATABASE
} from "./macroDataset";

export interface CatalogPairConfig {
  pair: string;
  isPublished: boolean;
  tier: "basic" | "pro";
  isTopMover: boolean;
  customDriverNote?: string;
}

export interface CatalogConfig {
  pairs: Record<string, CatalogPairConfig>;
  lastSavedAt: string;
}

export interface PillarBreakdown {
  indicator: string;
  baseRating: number;
  quoteRating: number;
  differential: number;
  weight: number;
  impact: "BULLISH" | "BEARISH" | "NEUTRAL";
  insight: string;
}

export interface TraderSignal {
  pair: string;
  base: string;
  quote: string;
  baseName: string;
  quoteName: string;
  baseCountry: string;
  quoteCountry: string;
  group: "EUR" | "GBP" | "USD" | "JPY" | "CROSS";
  scorePct: string;
  scoreNum: number;
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  biasFrench: "ACHETEUR" | "VENDEUR" | "NEUTRE";
  confidence: number;
  primaryDriver: string;
  carryAdvantage: string;
  tier: "basic" | "pro";
  isPublished: boolean;
  isTopMover: boolean;
  forecast3MTrend: {
    month: string;
    scorePct: string;
    bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  }[];
  pillars: PillarBreakdown[];
  executionStrategy: string;
  keyCatalyst: string;
  centralBankNext: string;
}

export const CANONICAL_28_PAIRS: string[] = [
  "EUR/USD", "EUR/GBP", "EUR/JPY", "EUR/CHF", "EUR/CAD", "EUR/AUD", "EUR/NZD",
  "GBP/USD", "GBP/JPY", "GBP/CHF", "GBP/CAD", "GBP/AUD", "GBP/NZD",
  "USD/JPY", "USD/CHF", "USD/CAD", "USD/AUD", "USD/NZD",
  "CHF/JPY", "CAD/JPY", "AUD/JPY", "NZD/JPY",
  "CAD/CHF", "AUD/CHF", "NZD/CHF", "AUD/CAD", "NZD/CAD", "AUD/NZD"
];

const CANONICAL_PAIRS_SET = new Set(CANONICAL_28_PAIRS);
export const ACTIVE_PAIRS = PAIRS.filter((p, index, self) => 
  CANONICAL_PAIRS_SET.has(p.name) && self.findIndex(x => x.name === p.name) === index
);

export const CATALOG_STORAGE_KEY = "shiftfx_user_catalog_config";
export const WATCHLIST_STORAGE_KEY = "shiftfx_user_watchlist";

// 8 Core pairs default to Basic tier; remaining 20 exotic/cross pairs default to Pro tier
const DEFAULT_BASIC_PAIRS = new Set([
  "EUR/USD", 
  "GBP/USD", 
  "USD/JPY", 
  "AUD/USD", 
  "USD/CAD", 
  "USD/CHF", 
  "NZD/USD", 
  "EUR/GBP"
]);

// Helper to determine group
function getPairGroup(pair: string): "EUR" | "GBP" | "USD" | "JPY" | "CROSS" {
  if (pair.startsWith("EUR/")) return "EUR";
  if (pair.startsWith("GBP/")) return "GBP";
  if (pair.startsWith("USD/")) return "USD";
  if (pair.endsWith("/JPY")) return "JPY";
  return "CROSS";
}

// Generate institutional driver summary for a pair based on actual macro data
function generateDriverSummary(pair: string, baseCountry: string, quoteCountry: string, scoreNum: number): {
  primaryDriver: string;
  executionStrategy: string;
  keyCatalyst: string;
  centralBankNext: string;
  carryAdvantage: string;
} {
  // Approximate policy rates from latest data in dataset
  const rates: Record<string, number> = {
    "USA": 5.00,
    "Euro Area": 3.40,
    "United Kingdom": 4.75,
    "Japan": 0.25,
    "Switzerland": 1.00,
    "Canada": 4.00,
    "Australia": 4.35,
    "New Zealand": 4.75
  };

  const baseRate = rates[baseCountry] ?? 3.50;
  const quoteRate = rates[quoteCountry] ?? 3.50;
  const diffRate = baseRate - quoteRate;
  const countryCodeMap: Record<string, string> = {
    "USA": "USA", "United States": "USA", "Euro Area": "EUR", "United Kingdom": "UK",
    "Japan": "JPY", "Switzerland": "CHF", "Canada": "CAD", "Australia": "AUD", "New Zealand": "NZD"
  };
  const baseCode = countryCodeMap[baseCountry] || baseCountry;
  const quoteCode = countryCodeMap[quoteCountry] || quoteCountry;
  const carryAdvantage = diffRate >= 0 
    ? `+${diffRate.toFixed(2)}% Carry (${baseCode})` 
    : `${diffRate.toFixed(2)}% Carry (${quoteCode})`;

  if (scoreNum >= 25) {
    return {
      primaryDriver: `Sovereign policy divergence favors ${baseCountry}: Hawkish central bank path & robust capital inflows vs ${quoteCountry} disinflation.`,
      executionStrategy: `Trend Accumulation: Accumulate long positions on 4-hour pullbacks toward institutional support with positive carry overlay.`,
      keyCatalyst: `Next quarterly GDP release & sovereign bond auction absorption.`,
      centralBankNext: `Policy rate decision scheduled in 14 trading days.`,
      carryAdvantage
    };
  }

  if (scoreNum >= 20) {
    return {
      primaryDriver: `Moderate growth momentum & favorable terms of trade in ${baseCountry} outpacing ${quoteCountry} macroeconomic deceleration.`,
      executionStrategy: `Momentum Buy: Scale in on breakout confirmation with trailing stop placed below 20-day exponential moving average.`,
      keyCatalyst: `CPI print & manufacturing PMI survey.`,
      centralBankNext: `Monetary policy statement in 21 days.`,
      carryAdvantage
    };
  }

  if (scoreNum <= -25) {
    return {
      primaryDriver: `Structural macroeconomic headwinds & aggressive rate cut cycle in ${baseCountry} confronting resilient economic outperformance in ${quoteCountry}.`,
      executionStrategy: `High-Conviction Short: Sell counter-trend rallies into key resistance zones with target at multi-quarter liquidity pools.`,
      keyCatalyst: `Central bank press conference and labor market participation report.`,
      centralBankNext: `Emergency policy review and benchmark update in 9 days.`,
      carryAdvantage
    };
  }

  if (scoreNum <= -20) {
    return {
      primaryDriver: `Persistent yield spread widening in favor of ${quoteCountry} exerting ongoing downward pressure on ${pair}.`,
      executionStrategy: `Trend Follow Short: Maintain defensive short bias with stop-loss anchored above daily swing highs.`,
      keyCatalyst: `Services sector inflation and retail sales volume.`,
      centralBankNext: `Quarterly monetary policy assessment in 18 days.`,
      carryAdvantage
    };
  }

  return {
    primaryDriver: `Balanced macroeconomic equilibrium: Countervailing growth and inflation differentials creating rangebound conditions.`,
    executionStrategy: `Mean-Reversion: Rangebound trading between upper and lower historical standard deviation bands. Avoid trend chasing.`,
    keyCatalyst: `Upcoming bilateral trade balance and consumer sentiment surveys.`,
    centralBankNext: `Neutral stance anticipated at next central bank meeting in 16 days.`,
    carryAdvantage
  };
}

// Generate indicator insight
function getIndicatorInsight(ind: string, base: string, quote: string, diff: number): string {
  if (ind === "Interest Rate") {
    return diff > 0 
      ? `${base} maintains an institutional carry & rate premium over ${quote}.`
      : `${quote} offers a higher risk-adjusted sovereign yield than ${base}.`;
  }
  if (ind === "CPI") {
    return diff > 0 
      ? `Inflation persistence in ${base} delays monetary easing relative to ${quote}.`
      : `Faster disinflation in ${base} opens room for central bank rate cuts.`;
  }
  if (ind === "GDP") {
    return diff > 0 
      ? `Real economic output expansion in ${base} outperforms ${quote}.`
      : `Growth slowdown in ${base} lags behind economic resilience in ${quote}.`;
  }
  if (ind === "Current Account") {
    return diff > 0 
      ? `Solid trade surplus & foreign reserve accumulation supports ${base}.`
      : `External deficit & terms-of-trade deterioration weighs on ${base}.`;
  }
  return diff > 0 ? `Positive differential supporting ${base}.` : `Negative differential favoring ${quote}.`;
}

// ----------------------------------------------------------------------------
// Load or Initialize Default Catalog Configuration
// ----------------------------------------------------------------------------
export function getCatalogConfig(): CatalogConfig {
  if (typeof window === "undefined") {
    return buildDefaultConfig();
  }

  try {
    const raw = localStorage.getItem(CATALOG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.pairs && Object.keys(parsed.pairs).length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to parse catalog config from localStorage", e);
  }

  const def = buildDefaultConfig();
  try {
    localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(def));
  } catch (e) {}
  return def;
}

export function buildDefaultConfig(): CatalogConfig {
  const pairsConfig: Record<string, CatalogPairConfig> = {};

  ACTIVE_PAIRS.forEach((p) => {
    // Top Movers default: USD/CHF (highest bullish) and EUR/CAD (highest bearish)
    const isTop = p.name === "USD/CHF" || p.name === "EUR/CAD";
    const tier = DEFAULT_BASIC_PAIRS.has(p.name) ? "basic" : "pro";

    pairsConfig[p.name] = {
      pair: p.name,
      isPublished: true,
      tier,
      isTopMover: isTop
    };
  });

  return {
    pairs: pairsConfig,
    lastSavedAt: new Date().toISOString()
  };
}

export function saveCatalogConfig(config: CatalogConfig): void {
  if (typeof window === "undefined") return;
  try {
    config.lastSavedAt = new Date().toISOString();
    localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event("shiftfx_catalog_updated"));
  } catch (e) {
    console.error("Failed to save catalog config", e);
  }
}

// ----------------------------------------------------------------------------
// Watchlist Management
// ----------------------------------------------------------------------------
export function getUserWatchlist(): string[] {
  if (typeof window === "undefined") return ["EUR/USD", "USD/JPY", "USD/CHF"];
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return ["EUR/USD", "USD/JPY", "USD/CHF"];
}

export function toggleUserWatchlist(pair: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const current = getUserWatchlist();
    const updated = current.includes(pair) 
      ? current.filter(p => p !== pair) 
      : [...current, pair];
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("shiftfx_watchlist_updated"));
    return updated;
  } catch (e) {
    return [];
  }
}

// ----------------------------------------------------------------------------
// Compute Live Trader Signals across all Pairs
// ----------------------------------------------------------------------------
export function getTraderSignals(year: number = SYSTEM_CURRENT_YEAR): TraderSignal[] {
  const config = getCatalogConfig();
  const currentMonthKey = `${year}-${SYSTEM_CURRENT_MONTH.toString().padStart(2, "0")}`;
  const forecastMonths = [`${year}-10`, `${year}-11`, `${year}-12`];

  // Load client forecast overrides if any
  let overrides: Record<string, any> = {};
  if (typeof window !== "undefined") {
    try {
      const storedOverrides = localStorage.getItem("shiftfx_final_score_forecast_overrides");
      if (storedOverrides) overrides = JSON.parse(storedOverrides);
    } catch (e) {}
  }

  return ACTIVE_PAIRS.map((pairData) => {
    const pairName = pairData.name;
    const pairConfig = config.pairs[pairName] || {
      pair: pairName,
      isPublished: true,
      tier: DEFAULT_BASIC_PAIRS.has(pairName) ? "basic" : "pro",
      isTopMover: false
    };

    // Calculate ratings for all 6 indicators for live month
    const pillars: PillarBreakdown[] = INDICATORS.map((ind) => {
      const diffList = getCombinedDifferentialData(pairName, ind, year);
      const liveItem = diffList.find(d => d.month === currentMonthKey) || diffList[diffList.length - 1];
      const differential = liveItem ? liveItem.rating : 0;
      const impact: "BULLISH" | "BEARISH" | "NEUTRAL" = differential >= 2 
        ? "BULLISH" 
        : differential <= -2 
        ? "BEARISH" 
        : "NEUTRAL";

      return {
        indicator: ind,
        baseRating: Math.round(differential / 2),
        quoteRating: -Math.round(differential / 2),
        differential,
        weight: 16.67,
        impact,
        insight: getIndicatorInsight(ind, pairData.baseCountry, pairData.quoteCountry, differential)
      };
    });

    const totalDifferential = pillars.reduce((acc, p) => acc + p.differential, 0);
    const scoreNum = parseFloat(((totalDifferential / 60) * 100).toFixed(1));
    const scorePct = scoreNum > 0 ? `+${scoreNum.toFixed(1)}%` : `${scoreNum.toFixed(1)}%`;
    const bias: "BULLISH" | "BEARISH" | "NEUTRAL" = scoreNum >= 20.0 
      ? "BULLISH" 
      : scoreNum <= -20.0 
      ? "BEARISH" 
      : "NEUTRAL";
    const biasFrench: "ACHETEUR" | "VENDEUR" | "NEUTRE" = bias === "BULLISH" 
      ? "ACHETEUR" 
      : bias === "BEARISH" 
      ? "VENDEUR" 
      : "NEUTRE";

    // Confidence derived from indicator alignment
    const positiveCount = pillars.filter(p => p.differential > 0).length;
    const negativeCount = pillars.filter(p => p.differential < 0).length;
    const dominantCount = Math.max(positiveCount, negativeCount);
    const confidence = Math.min(95, Math.max(55, Math.round((dominantCount / 6) * 100) - (bias === "NEUTRAL" ? 18 : 0)));

    // 3-Month Forward Forecast Trend
    const forecast3MTrend = forecastMonths.map((fm) => {
      const overrideKey = `${pairName}_${fm}`;
      if (overrides[overrideKey]) {
        const s = parseFloat(overrides[overrideKey].finalScorePct);
        const b = s >= 20.0 ? "BULLISH" : s <= -20.0 ? "BEARISH" : "NEUTRAL";
        return {
          month: fm,
          scorePct: s > 0 ? `+${s.toFixed(1)}%` : `${s.toFixed(1)}%`,
          bias: b as "BULLISH" | "BEARISH" | "NEUTRAL"
        };
      }

      // Default baseline estimation
      let fSum = 0;
      INDICATORS.forEach(ind => {
        const diffList = getCombinedDifferentialData(pairName, ind, year);
        const item = diffList.find(d => d.month === fm);
        fSum += item ? item.rating : 0;
      });
      const fNum = parseFloat(((fSum / 60) * 100).toFixed(1));
      const fBias = fNum >= 20.0 ? "BULLISH" : fNum <= -20.0 ? "BEARISH" : "NEUTRAL";
      return {
        month: fm,
        scorePct: fNum > 0 ? `+${fNum.toFixed(1)}%` : `${fNum.toFixed(1)}%`,
        bias: fBias as "BULLISH" | "BEARISH" | "NEUTRAL"
      };
    });

    const driverDetails = generateDriverSummary(pairName, pairData.baseCountry, pairData.quoteCountry, scoreNum);

    return {
      pair: pairName,
      base: pairData.base,
      quote: pairData.quote,
      baseName: pairData.baseName,
      quoteName: pairData.quoteName,
      baseCountry: pairData.baseCountry,
      quoteCountry: pairData.quoteCountry,
      group: getPairGroup(pairName),
      scorePct,
      scoreNum,
      bias,
      biasFrench,
      confidence,
      primaryDriver: driverDetails.primaryDriver,
      carryAdvantage: driverDetails.carryAdvantage,
      tier: pairConfig.tier,
      isPublished: pairConfig.isPublished,
      isTopMover: pairConfig.isTopMover,
      forecast3MTrend,
      pillars,
      executionStrategy: driverDetails.executionStrategy,
      keyCatalyst: driverDetails.keyCatalyst,
      centralBankNext: driverDetails.centralBankNext
    };
  });
}

// ----------------------------------------------------------------------------
// Calculate Relative Currency Strength Meter across the 8 G10 Currencies
// ----------------------------------------------------------------------------
export interface CurrencyStrength {
  currency: string;
  country: string;
  flag: string;
  netScore: number;
  bias: "STRONG" | "WEAK" | "NEUTRAL";
  driver: string;
}

export function getCurrencyStrengthMeter(signals: TraderSignal[]): CurrencyStrength[] {
  const currencyTotals: Record<string, { sum: number; count: number; country: string; flag: string }> = {
    "USD": { sum: 0, count: 0, country: "USA", flag: "us" },
    "EUR": { sum: 0, count: 0, country: "Euro Area", flag: "eu" },
    "GBP": { sum: 0, count: 0, country: "United Kingdom", flag: "gb" },
    "JPY": { sum: 0, count: 0, country: "Japan", flag: "jp" },
    "CHF": { sum: 0, count: 0, country: "Switzerland", flag: "ch" },
    "CAD": { sum: 0, count: 0, country: "Canada", flag: "ca" },
    "AUD": { sum: 0, count: 0, country: "Australia", flag: "au" },
    "NZD": { sum: 0, count: 0, country: "New Zealand", flag: "nz" }
  };

  signals.forEach((s) => {
    if (!s.isPublished) return;
    const [baseCur, quoteCur] = s.pair.split("/");
    if (currencyTotals[baseCur]) {
      currencyTotals[baseCur].sum += s.scoreNum;
      currencyTotals[baseCur].count += 1;
    }
    if (currencyTotals[quoteCur]) {
      currencyTotals[quoteCur].sum -= s.scoreNum;
      currencyTotals[quoteCur].count += 1;
    }
  });

  return Object.entries(currencyTotals).map(([cur, data]) => {
    const avg = data.count > 0 ? Math.round(data.sum / data.count) : 0;
    const bias: "STRONG" | "WEAK" | "NEUTRAL" = avg >= 15 ? "STRONG" : avg <= -15 ? "WEAK" : "NEUTRAL";

    let driver = "Balanced cross-currency flow";
    if (avg >= 20) driver = "Dominant institutional carry & yield inflow";
    else if (avg >= 10) driver = "Growth outperformance & terms-of-trade strength";
    else if (avg <= -20) driver = "Aggressive easing cycle & capital outflow";
    else if (avg <= -10) driver = "Disinflation pressure & growth decelerating";

    return {
      currency: cur,
      country: data.country,
      flag: data.flag,
      netScore: avg,
      bias,
      driver
    };
  }).sort((a, b) => b.netScore - a.netScore);
}
