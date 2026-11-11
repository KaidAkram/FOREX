"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon, CalendarIcon, ClockIcon, SyncIcon } from "@primer/octicons-react";
import { clsx } from "clsx";
import { useLanguage } from "@/context/LanguageContext";
import {
  BiquoteCalendarEvent,
  DEFAULT_MAJOR_COUNTRY_CODES,
  formatCalendarStat,
  formatRelativeCountdown,
  getCalendarFlagUrl,
} from "@/lib/biquoteCalendar";

type UpcomingApiResponse = {
  source: string;
  now: string;
  count: number;
  events: BiquoteCalendarEvent[];
};

function ImpactDots({ importance }: { importance: string }) {
  const imp = importance.toLowerCase();
  const level = imp === "high" ? 3 : imp === "medium" ? 2 : 1;
  const activeColor =
    level === 3 ? "bg-rose-400" : level === 2 ? "bg-amber-400" : "bg-sky-400";

  return (
    <span className="inline-flex items-end gap-[2px] h-2.5 shrink-0" aria-label={importance}>
      {[1, 2, 3].map((bar) => (
        <span
          key={bar}
          className={clsx(
            "w-[2.5px] rounded-full",
            bar === 1 ? "h-1.5" : bar === 2 ? "h-2" : "h-2.5",
            bar <= level ? activeColor : "bg-white/15"
          )}
        />
      ))}
    </span>
  );
}

export function UpcomingEventsWidget({
  variant = "header",
  href = "/admin/calendar",
  onOpenCalendar,
  className = "",
}: {
  variant?: "header" | "sidebar";
  href?: string;
  onOpenCalendar?: () => void;
  className?: string;
}) {
  const { lang } = useLanguage();
  const [highOnly, setHighOnly] = useState(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const countriesParam = DEFAULT_MAJOR_COUNTRY_CODES.join(",");
  const importanceParam = highOnly ? "high" : "high,medium,low";
  const limit = variant === "sidebar" ? 6 : 10;

  const { data, isLoading, isError, refetch, isFetching } = useQuery<UpcomingApiResponse>({
    queryKey: ["biquoteUpcomingEvents", variant, importanceParam],
    queryFn: async () => {
      const res = await fetch(
        `/api/calendar/upcoming?countries=${encodeURIComponent(countriesParam)}&importance=${encodeURIComponent(importanceParam)}&limit=${limit}`
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    staleTime: 45_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  const visibleEvents = useMemo(() => {
    const list = data?.events || [];
    const active = list.filter((ev) => {
      const ts = Date.parse(ev.time);
      return Number.isFinite(ts) && ts >= nowMs - 60_000;
    });
    return active.slice(0, variant === "sidebar" ? 3 : 6);
  }, [data?.events, nowMs, variant]);

  const formatTimeShort = (iso: string) => {
    const ts = Date.parse(iso);
    if (!Number.isFinite(ts)) return "—";
    return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  };

  if (variant === "sidebar") {
    return (
      <div
        className={clsx(
          "rounded-[18px] bg-black/35 border border-white/[0.07] p-2.5 flex flex-col gap-2",
          className
        )}
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4FF00] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#D4FF00]" />
            </span>
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-wider text-slate-300 truncate">
              {lang === "fr" ? "À Venir (Now)" : "Upcoming (Now)"}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setHighOnly((v) => !v)}
              className={clsx(
                "px-1.5 py-0.5 rounded font-mono text-[8.5px] font-bold uppercase transition-colors cursor-pointer border",
                highOnly
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/35"
                  : "bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-white"
              )}
              title={lang === "fr" ? "Filtrer fort impact" : "Filter high impact"}
            >
              {highOnly ? "HIGH" : "ALL"}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-9 rounded-xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <button
            type="button"
            onClick={() => refetch()}
            className="text-left text-[10px] font-mono text-rose-300/90 hover:text-rose-200 px-2 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 cursor-pointer"
          >
            {lang === "fr" ? "Flux Biquote indisponible • Réessayer" : "Biquote offline • Retry"}
          </button>
        ) : visibleEvents.length === 0 ? (
          <p className="text-[10px] font-sans text-slate-500 px-1 py-1">
            {lang === "fr" ? "Aucune annonce imminente." : "No imminent releases."}
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {visibleEvents.map((ev) => {
              const countdown = formatRelativeCountdown(ev.time, nowMs, lang);
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onOpenCalendar?.()}
                  className="w-full text-left rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] px-2 py-1.5 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-1.5 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img
                        src={getCalendarFlagUrl(ev.countryCode)}
                        alt={ev.countryCode}
                        className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                        loading="lazy"
                      />
                      <span className="font-mono text-[10px] font-bold text-white">
                        {ev.currency}
                      </span>
                      <ImpactDots importance={ev.importance} />
                    </div>
                    <span
                      suppressHydrationWarning
                      className={clsx(
                        "font-mono text-[9px] font-semibold tabular-nums shrink-0",
                        countdown.isImminent ? "text-[#D4FF00]" : "text-slate-400"
                      )}
                    >
                      {countdown.label}
                    </span>
                  </div>
                  <p className="font-sans text-[10.5px] text-slate-300 group-hover:text-white truncate">
                    {ev.name}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        <Link
          href={href}
          onClick={(e) => {
            if (onOpenCalendar) {
              e.preventDefault();
              onOpenCalendar();
            }
          }}
          className="flex items-center justify-between px-1.5 pt-0.5 font-sans text-[10.5px] font-semibold text-[#D4FF00] hover:underline"
        >
          <span>{lang === "fr" ? "Calendrier Complet" : "Full Calendar"}</span>
          <ArrowRightIcon size={11} />
        </Link>
      </div>
    );
  }

  // Header / Top Ticker Strip Variant (Admin Dashboard & Trader Portal)
  return (
    <section
      className={clsx(
        "rounded-[22px] bg-[#101218] border border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_16px_32px_-12px_rgba(0,0,0,0.6)] p-3.5 sm:p-4 mb-5",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D4FF00]/12 border border-[#D4FF00]/30 font-mono text-[10px] font-bold uppercase tracking-wider text-[#D4FF00]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
            {lang === "fr" ? "ÉVÉNEMENTS À VENIR • NOW" : "UPCOMING EVENTS • NOW"}
          </span>
          <span className="font-sans text-xs text-slate-400">
            {lang === "fr"
              ? "Prochaines annonces macroéconomiques imminentes (11 Pays Majeurs)"
              : "Imminent macroeconomic releases (11 Major Economies)"}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="inline-flex items-center rounded-full bg-[#090B10] border border-white/[0.06] p-0.5">
            <button
              type="button"
              onClick={() => setHighOnly(false)}
              className={clsx(
                "px-2.5 py-1 rounded-full font-sans text-[11px] font-semibold transition-colors cursor-pointer",
                !highOnly ? "bg-[#D4FF00] text-[#07080C]" : "text-slate-400 hover:text-white"
              )}
            >
              {lang === "fr" ? "Toutes" : "All"}
            </button>
            <button
              type="button"
              onClick={() => setHighOnly(true)}
              className={clsx(
                "px-2.5 py-1 rounded-full font-sans text-[11px] font-semibold transition-colors cursor-pointer",
                highOnly ? "bg-rose-500 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              {lang === "fr" ? "Fort (High)" : "High Only"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            title={lang === "fr" ? "Actualiser les annonces à venir" : "Refresh upcoming events"}
            className="h-7 w-7 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <SyncIcon size={12} className={clsx(isFetching && "animate-spin text-[#D4FF00]")} />
          </button>

          {onOpenCalendar ? (
            <button
              type="button"
              onClick={onOpenCalendar}
              className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-[#D4FF00] hover:underline cursor-pointer"
            >
              <CalendarIcon size={13} />
              <span>{lang === "fr" ? "Calendrier Complet" : "Full Calendar"}</span>
              <ArrowRightIcon size={12} />
            </button>
          ) : (
            <Link
              href={href}
              className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-[#D4FF00] hover:underline"
            >
              <CalendarIcon size={13} />
              <span>{lang === "fr" ? "Calendrier Complet" : "Full Calendar"}</span>
              <ArrowRightIcon size={12} />
            </Link>
          )}
        </div>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="h-[74px] rounded-2xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300">
            <span>
              {lang === "fr"
                ? "Impossible de joindre le flux Biquote pour les événements à venir."
                : "Unable to load Biquote upcoming events feed."}
            </span>
            <button
              type="button"
              onClick={() => refetch()}
              className="font-mono font-bold underline hover:text-white cursor-pointer"
            >
              {lang === "fr" ? "Réessayer" : "Retry"}
            </button>
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="text-xs font-sans text-slate-400 py-2">
            {lang === "fr"
              ? "Aucun événement à venir trouvé pour les filtres sélectionnés."
              : "No upcoming events found for the selected filters."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
            {visibleEvents.map((ev) => {
              const countdown = formatRelativeCountdown(ev.time, nowMs, lang);
              const imp = ev.importance.toLowerCase();
              const isHigh = imp === "high";
              const isMed = imp === "medium";
              const forecastDisplay = formatCalendarStat(ev.forecast, ev.unit, ev.multiplier, ev.digits);
              const prevDisplay = formatCalendarStat(ev.previous, ev.unit, ev.multiplier, ev.digits);

              return (
                <div
                  key={ev.id}
                  onClick={() => {
                    if (onOpenCalendar) onOpenCalendar();
                  }}
                  className={clsx(
                    "rounded-2xl bg-[#0A0B0F] border p-2.5 flex flex-col justify-between gap-1.5 transition-colors",
                    isHigh
                      ? "border-rose-500/25 hover:border-rose-400/50"
                      : isMed
                      ? "border-amber-500/20 hover:border-amber-400/40"
                      : "border-white/[0.06] hover:border-white/[0.14]",
                    onOpenCalendar && "cursor-pointer"
                  )}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img
                        src={getCalendarFlagUrl(ev.countryCode)}
                        alt={ev.countryCode}
                        className="w-4 h-4 rounded-full object-cover shrink-0"
                        loading="lazy"
                      />
                      <span className="font-mono text-[11px] font-bold text-white">
                        {ev.currency}
                      </span>
                      <ImpactDots importance={ev.importance} />
                    </div>
                    <span
                      suppressHydrationWarning
                      className={clsx(
                        "font-mono text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full shrink-0",
                        countdown.isImminent
                          ? "bg-[#D4FF00]/15 text-[#D4FF00]"
                          : "bg-white/[0.05] text-slate-300"
                      )}
                    >
                      {countdown.label}
                    </span>
                  </div>

                  <p
                    className="font-sans text-[11.5px] font-semibold text-slate-100 leading-snug line-clamp-2"
                    title={ev.name}
                  >
                    {ev.name}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 tabular-nums pt-1 border-t border-white/[0.04]">
                    <span className="inline-flex items-center gap-1" suppressHydrationWarning>
                      <ClockIcon size={10} />
                      {formatTimeShort(ev.time)}
                    </span>
                    <span className="truncate">
                      {forecastDisplay !== "—"
                        ? `${lang === "fr" ? "Prév" : "Fcst"}: ${forecastDisplay}`
                        : prevDisplay !== "—"
                        ? `${lang === "fr" ? "Préc" : "Prev"}: ${prevDisplay}`
                        : ev.countryCode}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

