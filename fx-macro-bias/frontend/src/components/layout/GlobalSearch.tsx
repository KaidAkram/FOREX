"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Command, 
  ArrowRight, 
  X,
  LayoutDashboard, 
  Activity, 
  TrendingUp, 
  Settings2, 
  Database, 
  LineChart,
  Globe2
} from "lucide-react";
import { clsx } from "clsx";

export interface SuggestionItem {
  id: string;
  category: "Pages" | "Indicators" | "FX Pairs" | "Countries";
  title: string;
  description: string;
  href: string;
  icon?: any;
  flag?: string;
  flags?: [string, string];
  badge?: string;
}

const SUGGESTIONS: SuggestionItem[] = [
  // Pages
  {
    id: "nav-dashboard",
    category: "Pages",
    title: "Terminal Dashboard",
    description: "System overview, active KPIs, and latest published data",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    badge: "Overview"
  },
  {
    id: "nav-analytics",
    category: "Pages",
    title: "Analytics & Telemetry",
    description: "High-frequency performance sparklines, score confidence",
    href: "/admin/analytics",
    icon: LineChart,
    badge: "Telemetry"
  },
  {
    id: "nav-macro-data",
    category: "Pages",
    title: "Macro Data Center",
    description: "Raw economic indicators pipeline, differentials & status",
    href: "/admin/macro-data",
    icon: Database,
    badge: "Pipeline"
  },
  {
    id: "nav-final-score",
    category: "Pages",
    title: "Final Score Matrix",
    description: "Pair × month macro bias matrix and drill-down scores",
    href: "/admin/final-score",
    icon: TrendingUp,
    badge: "Scores"
  },
  {
    id: "nav-rating-rules",
    category: "Pages",
    title: "Rating Rules",
    description: "Configure indicator differential-to-rating transformations",
    href: "/admin/rating-rules",
    icon: Settings2,
    badge: "Engine"
  },
  {
    id: "nav-settings",
    category: "Pages",
    title: "Engine & Scraper Settings",
    description: "Cron jobs, date ranges, language (EN/FR), scraper sources & model architecture guide",
    href: "/admin/settings",
    icon: Settings2,
    badge: "Config"
  },

  // Indicators
  {
    id: "ind-cpi",
    category: "Indicators",
    title: "CPI (Inflation)",
    description: "Consumer Price Index published statistics & differentials",
    href: "/admin/macro-data",
    icon: Activity,
    badge: "Macro"
  },
  {
    id: "ind-rates",
    category: "Indicators",
    title: "Interest Rates",
    description: "Central bank monetary policy benchmark rates",
    href: "/admin/macro-data",
    icon: Activity,
    badge: "Central Bank"
  },
  {
    id: "ind-gdp",
    category: "Indicators",
    title: "GDP Growth",
    description: "Quarterly Gross Domestic Product rates and economic output",
    href: "/admin/macro-data",
    icon: Activity,
    badge: "Output"
  },
  {
    id: "ind-current-account",
    category: "Indicators",
    title: "Current Account",
    description: "National trade balances, import/export capital accounts",
    href: "/admin/macro-data",
    icon: Activity,
    badge: "Trade"
  },
  {
    id: "ind-fx-reserves",
    category: "Indicators",
    title: "FX Reserves",
    description: "Foreign exchange reserve assets & international liquidity",
    href: "/admin/macro-data",
    icon: Activity,
    badge: "Reserves"
  },

  // Major FX Pairs
  {
    id: "pair-eurusd",
    category: "FX Pairs",
    title: "EUR/USD",
    description: "Euro / US Dollar macro bias, differentials and final score",
    href: "/admin/final-score",
    flags: ["eu", "us"],
    badge: "Major"
  },
  {
    id: "pair-gbpusd",
    category: "FX Pairs",
    title: "GBP/USD",
    description: "British Pound / US Dollar macro bias & rating calculations",
    href: "/admin/final-score",
    flags: ["gb", "us"],
    badge: "Major"
  },
  {
    id: "pair-usdjpy",
    category: "FX Pairs",
    title: "USD/JPY",
    description: "US Dollar / Japanese Yen macro bias & rate differentials",
    href: "/admin/final-score",
    flags: ["us", "jp"],
    badge: "Major"
  },
  {
    id: "pair-audusd",
    category: "FX Pairs",
    title: "AUD/USD",
    description: "Australian Dollar / US Dollar scoring matrix & commodities",
    href: "/admin/final-score",
    flags: ["au", "us"],
    badge: "Commodity"
  },
  {
    id: "pair-usdcad",
    category: "FX Pairs",
    title: "USD/CAD",
    description: "US Dollar / Canadian Dollar scoring and differential ratings",
    href: "/admin/final-score",
    flags: ["us", "ca"],
    badge: "Major"
  },
  {
    id: "pair-usdchf",
    category: "FX Pairs",
    title: "USD/CHF",
    description: "US Dollar / Swiss Franc safe-haven macro differential matrix",
    href: "/admin/final-score",
    flags: ["us", "ch"],
    badge: "Safe Haven"
  },
  {
    id: "pair-nzdusd",
    category: "FX Pairs",
    title: "NZD/USD",
    description: "New Zealand Dollar / US Dollar trade and score telemetry",
    href: "/admin/final-score",
    flags: ["nz", "us"],
    badge: "Major"
  },

  // Countries
  {
    id: "country-us",
    category: "Countries",
    title: "United States (Federal Reserve)",
    description: "US macro data: CPI, GDP, Fed Funds Rate, Non-Farm Payrolls",
    href: "/admin/macro-data",
    flag: "us",
    badge: "G10"
  },
  {
    id: "country-eu",
    category: "Countries",
    title: "Euro Area (ECB)",
    description: "European Central Bank deposit facility, HICP inflation, GDP",
    href: "/admin/macro-data",
    flag: "eu",
    badge: "G10"
  },
  {
    id: "country-gb",
    category: "Countries",
    title: "United Kingdom (Bank of England)",
    description: "BOE Official Bank Rate, UK CPI, ONS macroeconomic releases",
    href: "/admin/macro-data",
    flag: "gb",
    badge: "G10"
  },
  {
    id: "country-jp",
    category: "Countries",
    title: "Japan (Bank of Japan)",
    description: "BOJ policy rates, yield curve control, Tokyo CPI & accounts",
    href: "/admin/macro-data",
    flag: "jp",
    badge: "G10"
  },
  {
    id: "country-au",
    category: "Countries",
    title: "Australia (Reserve Bank of Australia)",
    description: "RBA Cash Rate target, Australian CPI & trade differentials",
    href: "/admin/macro-data",
    flag: "au",
    badge: "G10"
  },
  {
    id: "country-ca",
    category: "Countries",
    title: "Canada (Bank of Canada)",
    description: "BOC overnight rate target, StatCan inflation & trade",
    href: "/admin/macro-data",
    flag: "ca",
    badge: "G10"
  },
  {
    id: "country-ch",
    category: "Countries",
    title: "Switzerland (SNB)",
    description: "Swiss National Bank policy rate, Swiss inflation & accounts",
    href: "/admin/macro-data",
    flag: "ch",
    badge: "G10"
  }
];

interface GlobalSearchProps {
  className?: string;
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export function GlobalSearch({ className, placeholder, onSearch }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Shortcut listener (Cmd+K / Ctrl+K / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-global-search", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-global-search", handleCustomOpen);
    };
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery("");
      setSelectedIndex(0);
      setActiveCategory("All");
    }
  }, [isOpen]);

  // Filter items
  const filteredItems = useMemo(() => {
    let items = SUGGESTIONS;
    if (activeCategory !== "All") {
      items = items.filter((i) => i.category === activeCategory);
    }
    if (!query.trim()) return items;

    const q = query.toLowerCase().trim();
    return items.filter((item) =>
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.badge && item.badge.toLowerCase().includes(q))
    );
  }, [query, activeCategory]);

  // Ensure selectedIndex is in bounds
  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(0);
    }
  }, [filteredItems, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && listRef.current.children[selectedIndex]) {
      const itemEl = listRef.current.children[selectedIndex] as HTMLElement;
      itemEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  const handleSelect = (item: SuggestionItem) => {
    setIsOpen(false);
    if (onSearch) {
      onSearch(item.title);
    }
    router.push(item.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      } else if (query && onSearch) {
        onSearch(query);
        setIsOpen(false);
      }
    }
  };

  return (
    <>
      {/* Search Bar Trigger Button in the Header */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={clsx(
          "flex items-center gap-[12px] bg-[#1E2028]/80 hover:bg-[#252833] backdrop-blur-xl border border-white/5 hover:border-white/10 rounded-[16px] px-[20px] py-[14px] w-[280px] xl:w-[320px] transition-all duration-200 text-left group shadow-[0_8px_32px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-2 focus:ring-[#D2F646]/40",
          className
        )}
        aria-label="Open search dialog"
      >
        <Search size={18} className="text-[#A0A5B1] group-hover:text-[#D2F646] transition-colors flex-shrink-0" />
        <span className="font-sans font-medium text-[14px] text-[#A0A5B1] group-hover:text-white transition-colors flex-1 truncate">
          {placeholder || "Search indicators, pairs, pages..."}
        </span>
        <div className="flex items-center gap-[3px] bg-white/5 group-hover:bg-white/10 px-[7px] py-[3px] rounded-[6px] border border-white/5 transition-colors">
          <Command size={11} className="text-[#A0A5B1]" />
          <span className="font-mono font-bold text-[10px] text-[#A0A5B1]">K</span>
        </div>
      </button>

      {/* Glassmorphism Search Overlay Modal */}
      {isOpen && mounted && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4 overflow-hidden">
          {/* Glass Backdrop */}
          <div
            className="fixed inset-0 bg-[#090A0D]/75 backdrop-blur-2xl transition-all duration-300 animate-fadeIn"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Ambient Lighting Orbs */}
          <div className="fixed top-[5%] w-[600px] h-[320px] bg-[#D2F646]/10 blur-[130px] pointer-events-none rounded-full" />
          <div className="fixed top-[20%] w-[500px] h-[350px] bg-[#00E5FF]/10 blur-[150px] pointer-events-none rounded-full" />

          {/* Modal Container */}
          <div 
            className="relative w-full max-w-[680px] bg-[#161820]/90 backdrop-blur-3xl border border-white/10 rounded-[28px] shadow-[0_32px_90px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.05),0_0_40px_rgba(210,246,70,0.06)] overflow-hidden flex flex-col z-10 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input Row */}
            <div className="flex items-center px-[24px] py-[20px] border-b border-white/5 gap-[16px] bg-white/[0.02]">
              <div className="p-[8px] rounded-[12px] bg-[#D2F646]/10 border border-[#D2F646]/20 text-[#D2F646] flex items-center justify-center">
                <Search size={20} />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search indicators, pairs, countries, pages..."
                className="flex-1 bg-transparent border-none outline-none text-[#FFFFFF] font-sans text-[17px] placeholder:text-[#A0A5B1]/60 leading-none"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="p-[6px] rounded-full hover:bg-white/10 text-[#A0A5B1] hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-mono font-bold text-[#A0A5B1] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-[10px] py-[6px] rounded-[8px] transition-colors"
              >
                ESC
              </button>
            </div>

            {/* Filter Tabs / Quick Categories */}
            <div className="flex items-center gap-[8px] px-[24px] py-[12px] border-b border-white/5 bg-[#12141A]/50 overflow-x-auto no-scrollbar">
              {["All", "Pages", "Indicators", "FX Pairs", "Countries"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveCategory(tab);
                    setSelectedIndex(0);
                  }}
                  className={clsx(
                    "px-[12px] py-[6px] rounded-[10px] text-[12px] font-sans font-bold transition-all whitespace-nowrap",
                    activeCategory === tab
                      ? "bg-[#D2F646] text-[#121418] shadow-[0_0_12px_rgba(210,246,70,0.3)]"
                      : "text-[#A0A5B1] hover:text-white hover:bg-white/5"
                  )}
                >
                  {tab}
                </button>
              ))}
              {query && (
                <span className="text-[12px] font-sans text-[#A0A5B1] ml-auto whitespace-nowrap">
                  {filteredItems.length} result{filteredItems.length === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {/* Suggestions List */}
            <div 
              ref={listRef}
              className="flex flex-col p-[12px] max-h-[380px] overflow-y-auto no-scrollbar gap-[4px]"
            >
              {filteredItems.length > 0 ? (
                filteredItems.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={clsx(
                        "flex items-center justify-between w-full p-[12px] rounded-[14px] transition-all group text-left",
                        isSelected
                          ? "bg-white/[0.08] border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
                          : "hover:bg-white/[0.04] border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-[14px] min-w-0">
                        {/* Icon or Flags */}
                        {item.flags ? (
                          <div className="flex items-center flex-shrink-0 mr-[4px]">
                            <img src={`/flags/${item.flags[0]}.svg`} className="w-[20px] h-[20px] rounded-full border border-[#1E2028] z-10 shadow-sm" alt={item.flags[0]} />
                            <img src={`/flags/${item.flags[1]}.svg`} className="w-[20px] h-[20px] rounded-full border border-[#1E2028] -ml-[8px] z-0 shadow-sm" alt={item.flags[1]} />
                          </div>
                        ) : item.flag ? (
                          <img src={`/flags/${item.flag}.svg`} className="w-[22px] h-[22px] rounded-full border border-white/10 shadow-sm flex-shrink-0" alt={item.title} />
                        ) : (
                          <div className={clsx(
                            "p-[9px] rounded-[10px] transition-colors flex-shrink-0",
                            isSelected
                              ? "bg-[#D2F646]/15 text-[#D2F646] border border-[#D2F646]/30"
                              : "bg-white/5 border border-white/5 text-[#A0A5B1] group-hover:text-white group-hover:bg-white/10"
                          )}>
                            <item.icon size={16} />
                          </div>
                        )}

                        {/* Text Details */}
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-[8px]">
                            <span className={clsx(
                              "font-sans font-bold text-[15px] transition-colors truncate",
                              isSelected ? "text-white" : "text-white/90 group-hover:text-white"
                            )}>
                              {item.title}
                            </span>
                            {item.badge && (
                              <span className={clsx(
                                "px-[6px] py-[2px] rounded-[6px] text-[10px] font-sans font-bold uppercase tracking-wider",
                                isSelected
                                  ? "bg-[#D2F646]/20 text-[#D2F646] border border-[#D2F646]/30"
                                  : "bg-white/5 text-[#A0A5B1] border border-white/5"
                              )}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <span className="font-sans font-medium text-[12px] text-[#A0A5B1] truncate max-w-[440px]">
                            {item.description}
                          </span>
                        </div>
                      </div>

                      {/* Arrow Action */}
                      <div className="flex items-center gap-[8px] flex-shrink-0 pl-[12px]">
                        <ArrowRight
                          size={16}
                          className={clsx(
                            "transition-all duration-200",
                            isSelected
                              ? "text-[#D2F646] opacity-100 translate-x-0"
                              : "text-[#A0A5B1] opacity-0 -translate-x-2 group-hover:opacity-60 group-hover:translate-x-0"
                          )}
                        />
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-[48px] text-center flex flex-col items-center justify-center gap-[12px]">
                  <div className="p-[14px] rounded-full bg-white/5 border border-white/5 text-[#A0A5B1]">
                    <Search size={28} />
                  </div>
                  <div className="flex flex-col gap-[4px]">
                    <span className="font-sans font-bold text-[16px] text-white">No matches found</span>
                    <span className="font-sans font-normal text-[13px] text-[#A0A5B1]">
                      No suggestions or indicators matching &quot;{query}&quot;
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Navigation Hints */}
            <div className="flex items-center justify-between px-[24px] py-[14px] border-t border-white/5 bg-[#12141A]/70 text-[12px] font-sans text-[#A0A5B1]">
              <div className="flex items-center gap-[16px]">
                <span className="flex items-center gap-[6px]">
                  <kbd className="bg-white/5 border border-white/10 px-[6px] py-[2px] rounded-[4px] text-[10px] font-mono text-white">↑</kbd>
                  <kbd className="bg-white/5 border border-white/10 px-[6px] py-[2px] rounded-[4px] text-[10px] font-mono text-white">↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-[6px]">
                  <kbd className="bg-white/5 border border-white/10 px-[6px] py-[2px] rounded-[4px] text-[10px] font-mono text-white">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-[6px]">
                  <kbd className="bg-white/5 border border-white/10 px-[6px] py-[2px] rounded-[4px] text-[10px] font-mono text-white">ESC</kbd>
                  Close
                </span>
              </div>
              <div className="flex items-center gap-[8px]">
                <div className="w-[6px] h-[6px] rounded-full bg-[#D2F646] shadow-[0_0_6px_rgba(210,246,70,0.8)]" />
                <span className="font-semibold text-[11px] uppercase tracking-wider text-white/80">ShiftFX Global Search</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
