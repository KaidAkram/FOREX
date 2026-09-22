"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Command, ArrowRight, FileText, Activity, LayoutDashboard, Settings } from "lucide-react";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";

const SUGGESTIONS = [
  { icon: LayoutDashboard, label: "Dashboard Overview", href: "/admin/dashboard" },
  { icon: Activity, label: "Macro Data Terminal", href: "/admin/macro-data" },
  { icon: FileText, label: "Final Score Matrix", href: "/admin/final-score" },
  { icon: Settings, label: "Rating Rules Config", href: "/admin/rating-rules" },
  { icon: Activity, label: "Analytics & Telemetry", href: "/admin/analytics" },
];

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setQuery("");
    }
  }, [isOpen]);

  const filteredSuggestions = SUGGESTIONS.filter((s) =>
    s.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-[12px] bg-[#1E2028]/80 hover:bg-[#242731] border border-white/5 hover:border-white/10 rounded-[12px] px-[16px] py-[8px] w-[240px] xl:w-[320px] transition-all group"
      >
        <Search size={16} className="text-[#A0A5B1] group-hover:text-white transition-colors" />
        <span className="font-sans text-[13px] text-[#A0A5B1] group-hover:text-white transition-colors flex-1 text-left">
          Search anywhere...
        </span>
        <div className="flex items-center gap-[4px] opacity-60">
          <Command size={12} className="text-[#A0A5B1]" />
          <span className="font-sans font-bold text-[10px] text-[#A0A5B1]">K</span>
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]">
          {/* Glass Backdrop */}
          <div
            className="absolute inset-0 bg-[#0F1014]/60 backdrop-blur-md animate-fadeIn"
            onClick={() => setIsOpen(false)}
          />

          {/* Search Modal */}
          <div className="relative w-full max-w-2xl bg-[#1E2028]/95 backdrop-blur-2xl border border-white/10 rounded-[24px] shadow-2xl overflow-hidden flex flex-col animate-slideUp">
            <div className="flex items-center px-[24px] py-[20px] border-b border-white/5 gap-[16px]">
              <Search size={24} className="text-[#D2F646]" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search indicators, countries, pages..."
                className="flex-1 bg-transparent border-none outline-none text-[#FFFFFF] font-sans text-[18px] placeholder:text-[#A0A5B1]"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                onClick={() => setIsOpen(false)}
                className="text-[12px] font-bold font-sans text-[#A0A5B1] bg-white/5 hover:bg-white/10 px-[10px] py-[6px] rounded-[8px] transition-colors"
              >
                ESC
              </button>
            </div>

            <div className="flex flex-col p-[12px] max-h-[400px] overflow-y-auto no-scrollbar">
              {filteredSuggestions.length > 0 ? (
                <>
                  <span className="px-[12px] py-[8px] text-[11px] font-bold uppercase tracking-widest text-[#A0A5B1]">
                    Suggestions
                  </span>
                  {filteredSuggestions.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelect(item.href)}
                      className="flex items-center justify-between w-full p-[12px] rounded-[12px] hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-center gap-[16px]">
                        <div className="p-[8px] bg-white/5 border border-white/10 rounded-[8px] group-hover:bg-[#D2F646]/10 group-hover:border-[#D2F646]/20 group-hover:text-[#D2F646] text-[#A0A5B1] transition-colors">
                          <item.icon size={16} />
                        </div>
                        <span className="font-sans font-medium text-[15px] text-white group-hover:text-[#D2F646] transition-colors">
                          {item.label}
                        </span>
                      </div>
                      <ArrowRight
                        size={16}
                        className="text-[#A0A5B1] opacity-0 group-hover:opacity-100 group-hover:text-[#D2F646] -translate-x-4 group-hover:translate-x-0 transition-all duration-300"
                      />
                    </button>
                  ))}
                </>
              ) : (
                <div className="py-[40px] text-center flex flex-col items-center gap-[12px]">
                  <Search size={32} className="text-white/10" />
                  <span className="font-sans font-medium text-[14px] text-[#A0A5B1]">
                    No results found for "{query}"
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
