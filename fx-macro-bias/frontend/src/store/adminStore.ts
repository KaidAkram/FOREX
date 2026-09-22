import { create } from "zustand";

// ── Types ────────────────────────────────────────────────

type ActiveIndicator =
  | "gdp"
  | "cpi"
  | "interest_rate"
  | "fx_reserves"
  | "ca_gdp"
  | "equity";

type MacroDataView = "matrix" | "differential" | "rating";

interface AdminState {
  // Page 2 — Rating Rules
  activeRulesIndicator: ActiveIndicator;
  setActiveRulesIndicator: (slug: ActiveIndicator) => void;

  // Page 3 — Macro Data
  activeMacroIndicator: ActiveIndicator;
  setActiveMacroIndicator: (slug: ActiveIndicator) => void;
  activeMacroView: MacroDataView;
  setActiveMacroView: (view: MacroDataView) => void;
  selectedPair: string;
  setSelectedPair: (pair: string) => void;

  // Page 4 — Final Score drill-down
  drilldownOpen: boolean;
  drilldownPair: string | null;
  drilldownMonth: string | null;
  openDrilldown: (pair: string, month: string) => void;
  closeDrilldown: () => void;

  // Global recalculation state
  isRecalculating: boolean;
  setIsRecalculating: (v: boolean) => void;
}

// ── Store ────────────────────────────────────────────────

export const useAdminStore = create<AdminState>((set) => ({
  // Rating Rules
  activeRulesIndicator: "gdp",
  setActiveRulesIndicator: (slug) => set({ activeRulesIndicator: slug }),

  // Macro Data
  activeMacroIndicator: "gdp",
  setActiveMacroIndicator: (slug) => set({ activeMacroIndicator: slug }),
  activeMacroView: "matrix",
  setActiveMacroView: (view) => set({ activeMacroView: view }),
  selectedPair: "EUR/USD",
  setSelectedPair: (pair) => set({ selectedPair: pair }),

  // Drill-down
  drilldownOpen: false,
  drilldownPair: null,
  drilldownMonth: null,
  openDrilldown: (pair, month) =>
    set({ drilldownOpen: true, drilldownPair: pair, drilldownMonth: month }),
  closeDrilldown: () =>
    set({ drilldownOpen: false, drilldownPair: null, drilldownMonth: null }),

  // Recalculation
  isRecalculating: false,
  setIsRecalculating: (v) => set({ isRecalculating: v }),
}));
