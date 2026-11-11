"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertIcon,
  CalendarIcon,
  ClockIcon,
  GlobeIcon,
  LinkExternalIcon,
  SyncIcon,
} from "@primer/octicons-react";
import { clsx } from "clsx";
import {
  AdminPageHeader,
  CatalogueKPICard,
  SculptedFilterPod,
  SculptedTableContainer,
} from "@/components/admin/AdminPrimitives";
import { useLanguage } from "@/context/LanguageContext";
import {
  BiquoteCalendarEvent,
  CALENDAR_IMPORTANCE_LEVELS,
  CalendarImportance,
  DEFAULT_MAJOR_COUNTRY_CODES,
  MAJOR_CALENDAR_COUNTRIES,
  formatCalendarStat,
  formatRelativeCountdown,
  getActualVsForecastTone,
  getCalendarFlagUrl,
  sanitizeSourceUrl,
} from "@/lib/biquoteCalendar";

type CalendarApiResponse = {
  source: string;
  count: number;
  countries: string[];
  importance: CalendarImportance[];
  fetchedAt: string;
  events: BiquoteCalendarEvent[];
};

type DateRangePreset = "live" | "today" | "week" | "month" | "custom";

function formatIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const copy = new Date(base.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

const IMPACT_META: Record<
  CalendarImportance,
  { labelFr: string; labelEn: string; pillClass: string; activeClass: string; barColor: string; bars: number }
> = {
  high: {
    labelFr: "High (Fort)",
    labelEn: "High",
    pillClass: "bg-rose-500/15 text-rose-300 border-rose-500/35",
    activeClass: "bg-rose-500 text-white border-rose-400 shadow-[0_0_16px_rgba(244,63,94,0.3)]",
    barColor: "bg-rose-400",
    bars: 3,
  },
  medium: {
    labelFr: "Medium (Moyen)",
    labelEn: "Medium",
    pillClass: "bg-amber-500/15 text-amber-300 border-amber-500/35",
    activeClass: "bg-amber-400 text-[#07080C] border-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.28)]",
    barColor: "bg-amber-400",
    bars: 2,
  },
  low: {
    labelFr: "Low (Faible)",
    labelEn: "Low",
    pillClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    activeClass: "bg-sky-400 text-[#07080C] border-sky-300 shadow-[0_0_16px_rgba(56,189,248,0.28)]",
    barColor: "bg-sky-400",
    bars: 1,
  },
};

export function EconomicCalendarView({ embedded = false }: { embedded?: boolean }) {
  const { lang } = useLanguage();

  // Filters: 3 Impact Levels & 11 Major Countries pre-selected by default
  const [selectedImpacts, setSelectedImpacts] = useState<CalendarImportance[]>([
    "high",
    "medium",
    "low",
  ]);
  const [countryMode, setCountryMode] = useState<"majors" | "all">("majors");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([
    ...DEFAULT_MAJOR_COUNTRY_CODES,
  ]);
  const [datePreset, setDatePreset] = useState<DateRangePreset>("live");
  const [customFrom, setCustomFrom] = useState<string>(() => formatIsoDate(new Date()));
  const [customTo, setCustomTo] = useState<string>(() => formatIsoDate(addDays(new Date(), 7)));
  const [timezoneMode, setTimezoneMode] = useState<"local" | "utc">("local");
  const [searchQuery, setSearchQuery] = useState("");
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { fromParam, toParam } = useMemo(() => {
    const today = new Date();
    if (datePreset === "today") {
      const d = formatIsoDate(today);
      return { fromParam: d, toParam: d };
    }
    if (datePreset === "week") {
      return { fromParam: formatIsoDate(today), toParam: formatIsoDate(addDays(today, 7)) };
    }
    if (datePreset === "month") {
      return { fromParam: formatIsoDate(today), toParam: formatIsoDate(addDays(today, 30)) };
    }
    if (datePreset === "custom") {
      return { fromParam: customFrom || undefined, toParam: customTo || undefined };
    }
    return { fromParam: undefined, toParam: undefined };
  }, [datePreset, customFrom, customTo]);

  const effectiveCountriesQuery =
    countryMode === "all" ? "ALL" : selectedCountries.join(",");
  const effectiveImportanceQuery = selectedImpacts.join(",");
  const hasAnySelection =
    selectedImpacts.length > 0 &&
    (countryMode === "all" || selectedCountries.length > 0);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<CalendarApiResponse>({
    queryKey: [
      "biquoteEconomicCalendar",
      effectiveCountriesQuery,
      effectiveImportanceQuery,
      fromParam || "live",
      toParam || "live",
    ],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("countries", effectiveCountriesQuery);
      qs.set("importance", effectiveImportanceQuery);
      if (fromParam) qs.set("from", fromParam);
      if (toParam) qs.set("to", toParam);
      const res = await fetch(`/api/calendar?${qs.toString()}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    enabled: hasAnySelection,
    staleTime: 45_000,
    refetchInterval: 120_000,
    retry: 1,
  });

  const filteredEvents = useMemo(() => {
    if (!hasAnySelection) return [];
    const list = data?.events || [];
    const impSet = new Set<string>(selectedImpacts);
    const q = searchQuery.trim().toLowerCase();

    return list.filter((ev) => {
      if (!impSet.has(String(ev.importance || "").toLowerCase())) return false;
      if (!q) return true;
      return (
        ev.name.toLowerCase().includes(q) ||
        ev.countryCode.toLowerCase().includes(q) ||
        ev.currency.toLowerCase().includes(q) ||
        (ev.sector || "").toLowerCase().includes(q)
      );
    });
  }, [data?.events, selectedImpacts, searchQuery, hasAnySelection]);

  const groupedByDate = useMemo(() => {
    const groups: Array<{ dateKey: string; dateLabel: string; events: BiquoteCalendarEvent[] }> = [];
    const map = new Map<string, BiquoteCalendarEvent[]>();

    for (const ev of filteredEvents) {
      const ts = Date.parse(ev.time);
      const key = Number.isFinite(ts)
        ? new Intl.DateTimeFormat("en-CA", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            timeZone: timezoneMode === "utc" ? "UTC" : undefined,
          }).format(new Date(ts))
        : "unknown";
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(ev);
    }

    for (const [dateKey, events] of Array.from(map.entries())) {
      let dateLabel = dateKey;
      const sampleTs = Date.parse(events[0].time);
      if (Number.isFinite(sampleTs)) {
        dateLabel = new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: timezoneMode === "utc" ? "UTC" : undefined,
        }).format(new Date(sampleTs));
        dateLabel = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
      }
      groups.push({ dateKey, dateLabel, events });
    }

    return groups;
  }, [filteredEvents, timezoneMode, lang]);

  const stats = useMemo(() => {
    let highCount = 0;
    let upcomingCount = 0;
    for (const ev of filteredEvents) {
      if (String(ev.importance).toLowerCase() === "high") highCount++;
      const ts = Date.parse(ev.time);
      if (Number.isFinite(ts) && ts >= nowMs) upcomingCount++;
    }
    return {
      total: filteredEvents.length,
      highCount,
      upcomingCount,
      countriesLabel:
        countryMode === "all"
          ? lang === "fr"
            ? "Tous"
            : "All"
          : `${selectedCountries.length} / 11`,
    };
  }, [filteredEvents, nowMs, countryMode, selectedCountries.length, lang]);

  const toggleImportance = (level: CalendarImportance) => {
    setSelectedImpacts((prev) =>
      prev.includes(level)
        ? prev.filter((item) => item !== level)
        : CALENDAR_IMPORTANCE_LEVELS.filter((l) => l === level || prev.includes(l))
    );
  };

  const toggleCountry = (code: string) => {
    setCountryMode("majors");
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const resetMajorCountries = () => {
    setCountryMode("majors");
    setSelectedCountries([...DEFAULT_MAJOR_COUNTRY_CODES]);
  };

  const formatEventTime = (ev: BiquoteCalendarEvent) => {
    const ts = Date.parse(ev.time);
    if (!Number.isFinite(ts)) return "—";
    if (ev.timeMode === "date") return lang === "fr" ? "Journée" : "All Day";
    if (ev.timeMode === "tentative") return lang === "fr" ? "Tentatif" : "Tentative";
    return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezoneMode === "utc" ? "UTC" : undefined,
    }).format(new Date(ts));
  };

  return (
    <div
      className={clsx(
        "w-full mx-auto flex flex-col text-white font-sans",
        embedded ? "p-0" : "max-w-[1600px] p-3.5 sm:p-5 lg:p-6 xl:p-8"
      )}
    >
      {!embedded && (
        <AdminPageHeader
          eyebrow={lang === "fr" ? "BIQUOTE MARKET FEED • SHIFTFX" : "BIQUOTE MARKET FEED • SHIFTFX"}
          badgeText="LIVE API"
          title={lang === "fr" ? "Calendrier Économique Complet" : "Full Economic Calendar"}
          searchPlaceholder={
            lang === "fr" ? "Filtrer événement, devise (CPI, Fed)..." : "Search event, currency (CPI, Fed)..."
          }
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          rightActions={
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-full bg-[#10131A] border border-white/[0.08] p-0.5 text-xs">
                {(["local", "utc"] as const).map((tz) => (
                  <button
                    key={tz}
                    type="button"
                    onClick={() => setTimezoneMode(tz)}
                    className={clsx(
                      "px-3 py-1.5 rounded-full font-mono text-[11px] font-semibold uppercase transition-colors cursor-pointer",
                      timezoneMode === tz ? "bg-[#D4FF00] text-[#07080C]" : "text-slate-400 hover:text-white"
                    )}
                  >
                    {tz === "local" ? (lang === "fr" ? "Locale" : "Local") : "UTC"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-10 px-3.5 rounded-full border border-white/[0.08] bg-[#10131A] hover:border-white/20 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <SyncIcon size={14} className={clsx(isFetching && "animate-spin text-[#D4FF00]")} />
                <span>{lang === "fr" ? "Actualiser" : "Refresh"}</span>
              </button>
            </div>
          }
        />
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-5">
        <CatalogueKPICard
          title={lang === "fr" ? "ANNONCES FILTRÉES" : "FILTERED RELEASES"}
          value={String(stats.total)}
          numericValue={stats.total}
          decimals={0}
          unit={lang === "fr" ? "Événements" : "Events"}
          subtitle={
            lang === "fr" ? "Flux Biquote temps réel" : "Biquote live calendar feed"
          }
          variant="lime"
          icon={<CalendarIcon size={16} />}
          bars={[45, 70, 85, 100]}
          className="h-[115px] sm:h-[126px]"
        />
        <CatalogueKPICard
          title={lang === "fr" ? "FORT IMPACT (HIGH)" : "HIGH IMPACT"}
          value={String(stats.highCount)}
          numericValue={stats.highCount}
          decimals={0}
          unit={lang === "fr" ? "Majeurs" : "Major"}
          subtitle={lang === "fr" ? "Catalyseurs de volatilité FX" : "Key FX volatility drivers"}
          variant="rose"
          icon={<AlertIcon size={16} />}
          bars={[65, 80, 95, 100]}
          className="h-[115px] sm:h-[126px]"
        />
        <CatalogueKPICard
          title={lang === "fr" ? "À VENIR (NOW)" : "UPCOMING (NOW)"}
          value={String(stats.upcomingCount)}
          numericValue={stats.upcomingCount}
          decimals={0}
          unit={lang === "fr" ? "Planifiés" : "Scheduled"}
          subtitle={lang === "fr" ? "À partir de l'instant présent" : "From current timestamp"}
          variant="emerald"
          icon={<ClockIcon size={16} />}
          bars={[50, 65, 85, 95]}
          className="h-[115px] sm:h-[126px]"
        />
        <CatalogueKPICard
          title={lang === "fr" ? "PAYS SÉLECTIONNÉS" : "ACTIVE ECONOMIES"}
          value={stats.countriesLabel}
          unit={countryMode === "all" ? (lang === "fr" ? "Global" : "Global") : lang === "fr" ? "Majeurs" : "Majors"}
          subtitle="US • EU • GB • JP • CA • AU • CH • NZ • SE • NO • CN"
          variant="sky"
          icon={<GlobeIcon size={16} />}
          bars={[70, 80, 90, 100]}
          className="h-[115px] sm:h-[126px]"
        />
      </div>

      {/* Interactive Filter Controls */}
      <SculptedFilterPod className="flex flex-col gap-4">
        {/* Top Filter Bar: Impact + Date Window + Embedded Search */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          {/* Impact Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
              {lang === "fr" ? "Impact :" : "Impact:"}
            </span>

            {CALENDAR_IMPORTANCE_LEVELS.map((lvl) => {
              const meta = IMPACT_META[lvl];
              const active = selectedImpacts.includes(lvl);
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => toggleImportance(lvl)}
                  className={clsx(
                    "px-3 py-1.5 rounded-full border font-sans text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
                    active
                      ? meta.activeClass
                      : "bg-white/[0.03] text-slate-400 border-white/[0.08] hover:text-white hover:border-white/20"
                  )}
                >
                  <span className="inline-flex items-end gap-[2px] h-3">
                    {[1, 2, 3].map((b) => (
                      <span
                        key={b}
                        className={clsx(
                          "w-[3px] rounded-full",
                          b === 1 ? "h-1.5" : b === 2 ? "h-2.5" : "h-3",
                          b <= meta.bars
                            ? active
                              ? lvl === "high"
                                ? "bg-white"
                                : "bg-[#07080C]"
                              : meta.barColor
                            : "bg-white/15"
                        )}
                      />
                    ))}
                  </span>
                  <span>{lang === "fr" ? meta.labelFr : meta.labelEn}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setSelectedImpacts(["high"])}
              className="px-2.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] font-mono text-[10px] font-bold text-slate-300 cursor-pointer"
            >
              {lang === "fr" ? "Isoler Fort" : "High Only"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedImpacts(["high", "medium", "low"])}
              className="px-2.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] font-mono text-[10px] font-bold text-[#D4FF00] cursor-pointer"
            >
              {lang === "fr" ? "Tous (3)" : "All (3)"}
            </button>
          </div>

          {/* Date Horizon & Search (for embedded mode) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center rounded-full bg-[#090B10] border border-white/[0.06] p-0.5 text-xs">
              {(
                [
                  { id: "live", fr: "Fenêtre Live", en: "Live Window" },
                  { id: "today", fr: "Aujourd'hui", en: "Today" },
                  { id: "week", fr: "7 Jours", en: "7 Days" },
                  { id: "month", fr: "30 Jours", en: "30 Days" },
                  { id: "custom", fr: "Dates", en: "Custom" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDatePreset(tab.id)}
                  className={clsx(
                    "px-3 py-1 rounded-full font-sans text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap",
                    datePreset === tab.id ? "bg-[#D4FF00] text-[#07080C]" : "text-slate-400 hover:text-white"
                  )}
                >
                  {lang === "fr" ? tab.fr : tab.en}
                </button>
              ))}
            </div>

            {embedded && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === "fr" ? "Rechercher..." : "Search..."}
                  className="h-8 px-3 rounded-full bg-[#090B10] border border-white/[0.08] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#D4FF00]/50 w-44"
                />
                <button
                  type="button"
                  onClick={() => setTimezoneMode((tz) => (tz === "local" ? "utc" : "local"))}
                  className="h-8 px-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono text-[10px] font-bold text-slate-300 hover:text-white cursor-pointer"
                >
                  {timezoneMode.toUpperCase()}
                </button>
              </div>
            )}
          </div>
        </div>

        {datePreset === "custom" && (
          <div className="flex items-center gap-3 flex-wrap text-xs">
            <label className="flex items-center gap-2 text-slate-400">
              <span>{lang === "fr" ? "Du :" : "From:"}</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#090B10] border border-white/[0.1] font-mono text-white"
              />
            </label>
            <label className="flex items-center gap-2 text-slate-400">
              <span>{lang === "fr" ? "Au :" : "To:"}</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#090B10] border border-white/[0.1] font-mono text-white"
              />
            </label>
          </div>
        )}

        {/* Major Countries Filter Chips */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {lang === "fr"
                ? "Pays Majeurs Pré-sélectionnés (11 Économies Clés) :"
                : "Pre-Selected Major Economies (11 Key Markets):"}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={resetMajorCountries}
                className={clsx(
                  "px-2.5 py-1 rounded-full font-mono text-[10px] font-bold border transition-colors cursor-pointer",
                  countryMode === "majors" && selectedCountries.length === DEFAULT_MAJOR_COUNTRY_CODES.length
                    ? "bg-[#D4FF00]/15 text-[#D4FF00] border-[#D4FF00]/35"
                    : "bg-white/[0.04] text-slate-300 border-white/[0.08] hover:text-white"
                )}
              >
                {lang === "fr" ? "11 Pays Majeurs (Défaut)" : "11 Major Countries (Default)"}
              </button>
              <button
                type="button"
                onClick={() => setCountryMode("all")}
                className={clsx(
                  "px-2.5 py-1 rounded-full font-mono text-[10px] font-bold border transition-colors cursor-pointer",
                  countryMode === "all"
                    ? "bg-[#D4FF00] text-[#07080C] border-[#D4FF00]"
                    : "bg-white/[0.04] text-slate-300 border-white/[0.08] hover:text-white"
                )}
              >
                {lang === "fr" ? "Tous les pays (Global)" : "All Countries (Global)"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {MAJOR_CALENDAR_COUNTRIES.map((country) => {
              const active =
                countryMode === "majors" && selectedCountries.includes(country.code);
              return (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => toggleCountry(country.code)}
                  className={clsx(
                    "px-2.5 py-1.5 rounded-full border flex items-center gap-2 text-xs font-sans transition-all cursor-pointer",
                    active
                      ? "bg-white/[0.10] text-white border-[#D4FF00]/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                      : countryMode === "all"
                      ? "bg-white/[0.03] text-slate-400 border-white/[0.06] opacity-60 hover:opacity-100"
                      : "bg-[#090B10] text-slate-500 border-white/[0.05] hover:text-slate-300"
                  )}
                >
                  <img
                    src={`https://hatscripts.github.io/circle-flags/flags/${country.flagIso}.svg`}
                    alt={country.code}
                    className="w-4 h-4 rounded-full object-cover shrink-0"
                    loading="lazy"
                  />
                  <span className="font-mono text-[11px] font-bold">{country.code}</span>
                  <span className="text-[11px] hidden sm:inline">
                    {lang === "fr" ? country.labelFr : country.labelEn}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </SculptedFilterPod>

      {/* Main Calendar Table */}
      <SculptedTableContainer>
        {!hasAnySelection ? (
          <div className="py-16 px-6 text-center flex flex-col items-center gap-3">
            <p className="font-sans text-sm text-slate-300">
              {lang === "fr"
                ? "Sélectionnez au moins un niveau d'impact et un pays pour afficher le calendrier."
                : "Select at least one impact level and one country to display events."}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedImpacts(["high", "medium", "low"]);
                resetMajorCountries();
              }}
              className="px-4 py-2 rounded-full bg-[#D4FF00] text-[#07080C] font-sans text-xs font-bold cursor-pointer"
            >
              {lang === "fr" ? "Rétablir les filtres par défaut" : "Restore Default Filters"}
            </button>
          </div>
        ) : isLoading ? (
          <div className="p-6 space-y-2.5">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="h-11 rounded-xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-14 px-6 text-center flex flex-col items-center gap-3">
            <p className="font-sans text-sm text-rose-300">
              {error instanceof Error ? error.message : "Failed to load Biquote calendar."}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-4 py-2 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-200 font-mono text-xs font-bold cursor-pointer hover:bg-rose-500/30"
            >
              {lang === "fr" ? "Réessayer" : "Retry"}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[920px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#0B0D13] font-mono text-[10.5px] uppercase tracking-wider text-slate-400 h-10">
                  <th className="px-5 py-2">{lang === "fr" ? "Heure" : "Time"} ({timezoneMode.toUpperCase()})</th>
                  <th className="px-3 py-2">{lang === "fr" ? "Pays / Devise" : "Country / Ccy"}</th>
                  <th className="px-3 py-2 text-center">Impact</th>
                  <th className="px-4 py-2">{lang === "fr" ? "Annonce Économique" : "Economic Event"}</th>
                  <th className="px-3 py-2 text-right">{lang === "fr" ? "Réel" : "Actual"}</th>
                  <th className="px-3 py-2 text-right">{lang === "fr" ? "Prévision" : "Forecast"}</th>
                  <th className="px-5 py-2 text-right">{lang === "fr" ? "Précédent" : "Previous"}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.04] text-xs">
                {groupedByDate.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center font-mono text-xs text-slate-400">
                      {lang === "fr"
                        ? "Aucun événement économique trouvé pour cette sélection."
                        : "No economic events found for this filter selection."}
                    </td>
                  </tr>
                ) : (
                  groupedByDate.map((group) => (
                    <React.Fragment key={group.dateKey}>
                      <tr className="bg-white/[0.025]">
                        <td
                          colSpan={7}
                          className="px-5 py-2 font-display text-xs font-bold tracking-wide text-[#D4FF00]"
                        >
                          <span className="inline-flex items-center gap-2">
                            <CalendarIcon size={13} />
                            <span>{group.dateLabel}</span>
                            <span className="font-mono text-[10px] text-slate-400 font-normal">
                              ({group.events.length})
                            </span>
                          </span>
                        </td>
                      </tr>

                      {group.events.map((ev) => {
                        const imp = String(ev.importance || "low").toLowerCase() as CalendarImportance;
                        const meta = IMPACT_META[imp] || IMPACT_META.low;
                        const ts = Date.parse(ev.time);
                        const isUpcoming = Number.isFinite(ts) && ts >= nowMs;
                        const countdown = isUpcoming ? formatRelativeCountdown(ev.time, nowMs, lang) : null;

                        const actualStr = formatCalendarStat(ev.actual, ev.unit, ev.multiplier, ev.digits);
                        const forecastStr = formatCalendarStat(ev.forecast, ev.unit, ev.multiplier, ev.digits);
                        const previousStr = formatCalendarStat(ev.previous, ev.unit, ev.multiplier, ev.digits);
                        const revisedStr = formatCalendarStat(
                          ev.revisedPrevious,
                          ev.unit,
                          ev.multiplier,
                          ev.digits
                        );
                        const tone = getActualVsForecastTone(ev.actual, ev.forecast);
                        const safeSrc = sanitizeSourceUrl(ev.sourceUrl);

                        return (
                          <tr
                            key={ev.id}
                            className={clsx(
                              "hover:bg-white/[0.03] transition-colors h-12",
                              isUpcoming && countdown?.isImminent && "bg-[#D4FF00]/[0.025]"
                            )}
                          >
                            <td className="px-5 py-2 whitespace-nowrap font-mono tabular-nums">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-200 font-semibold" suppressHydrationWarning>
                                  {formatEventTime(ev)}
                                </span>
                                {isUpcoming && countdown ? (
                                  <span
                                    suppressHydrationWarning
                                    className={clsx(
                                      "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                                      countdown.isImminent
                                        ? "bg-[#D4FF00]/15 text-[#D4FF00] border-[#D4FF00]/35"
                                        : "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                                    )}
                                  >
                                    {countdown.label}
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-slate-500 border border-white/[0.06]">
                                    {lang === "fr" ? "PUBLIÉ" : "RELEASED"}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <img
                                  src={getCalendarFlagUrl(ev.countryCode)}
                                  alt={ev.countryCode}
                                  className="w-4 h-4 rounded-full object-cover shrink-0"
                                  loading="lazy"
                                />
                                <span className="font-mono font-bold text-white">{ev.countryCode}</span>
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400">
                                  {ev.currency}
                                </span>
                              </div>
                            </td>

                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              <span
                                className={clsx(
                                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-mono text-[9.5px] font-bold uppercase",
                                  meta.pillClass
                                )}
                              >
                                <span className="inline-flex items-end gap-[2px] h-2.5">
                                  {[1, 2, 3].map((b) => (
                                    <span
                                      key={b}
                                      className={clsx(
                                        "w-[2.5px] rounded-full",
                                        b === 1 ? "h-1.5" : b === 2 ? "h-2" : "h-2.5",
                                        b <= meta.bars ? meta.barColor : "bg-white/15"
                                      )}
                                    />
                                  ))}
                                </span>
                                {imp.toUpperCase()}
                              </span>
                            </td>

                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-sans font-semibold text-white">
                                  {ev.name}
                                </span>
                                {ev.sector && (
                                  <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono text-[9.5px] text-slate-400">
                                    {ev.sector}
                                  </span>
                                )}
                                {safeSrc && (
                                  <a
                                    href={safeSrc}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-slate-500 hover:text-[#D4FF00] transition-colors"
                                    title={safeSrc}
                                  >
                                    <LinkExternalIcon size={12} />
                                  </a>
                                )}
                              </div>
                            </td>

                            <td className="px-3 py-2 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                              <span
                                className={clsx(
                                  tone === "beat"
                                    ? "text-emerald-400"
                                    : tone === "miss"
                                    ? "text-rose-400"
                                    : actualStr === "—"
                                    ? "text-slate-500"
                                    : "text-white"
                                )}
                              >
                                {actualStr}
                              </span>
                            </td>

                            <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                              {forecastStr}
                            </td>

                            <td className="px-5 py-2 text-right font-mono tabular-nums text-slate-400 whitespace-nowrap">
                              <span>{previousStr}</span>
                              {revisedStr !== "—" && revisedStr !== previousStr && (
                                <span
                                  className="ml-1 text-[10px] text-amber-300/80"
                                  title={`${lang === "fr" ? "Révisé depuis" : "Revised from"} ${revisedStr}`}
                                >
                                  ({revisedStr})
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06] bg-[#0B0D13] font-mono text-[11px] text-slate-400 flex-wrap gap-2">
          <span>
            Source : <strong className="text-white">biquote.io/api/calendar</strong> ({groupedByDate.length}{" "}
            {lang === "fr" ? "jours" : "days"})
          </span>
          {data?.fetchedAt && (
            <span suppressHydrationWarning>
              {lang === "fr" ? "Synchronisé :" : "Synced:"}{" "}
              {new Date(data.fetchedAt).toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-US")}
            </span>
          )}
        </div>
      </SculptedTableContainer>
    </div>
  );
}
