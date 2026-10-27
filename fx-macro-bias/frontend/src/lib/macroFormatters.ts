// Fixes missing flags on Données Macro (including Sweden & Norway) and fixes -2.668661% floats!
export const SOVEREIGN_TO_ISO: Record<string, string> = {
  USA: "us",
  "United States": "us",
  "États-Unis": "us",
  USD: "us",
  "Euro Area": "eu",
  "Zone Euro": "eu",
  EUR: "eu",
  Japan: "jp",
  Japon: "jp",
  JPY: "jp",
  "United Kingdom": "gb",
  "Royaume-Uni": "gb",
  UK: "gb",
  GBP: "gb",
  Australia: "au",
  Australie: "au",
  AUD: "au",
  Canada: "ca",
  CAD: "ca",
  Switzerland: "ch",
  Suisse: "ch",
  CHF: "ch",
  "New Zealand": "nz",
  "Nouvelle-Zélande": "nz",
  NZD: "nz",
  Sweden: "se",
  Suède: "se",
  SEK: "se",
  Norway: "no",
  Norvège: "no",
  NOK: "no",
};

export function getCountryFlagUrl(countryOrCode: string): string {
  if (!countryOrCode) return "https://hatscripts.github.io/circle-flags/flags/un.svg";
  const key = countryOrCode.trim();
  const iso = SOVEREIGN_TO_ISO[key] || SOVEREIGN_TO_ISO[key.toUpperCase()] || "un";
  return `https://hatscripts.github.io/circle-flags/flags/${iso}.svg`;
}

// Formats -2.668661% -> -2.67% and 3.0000% -> 3.0%
export function formatCleanMacroPercent(raw: number | string): string {
  if (raw === undefined || raw === null || raw === "") return "0.0%";
  const num = typeof raw === "string" ? parseFloat(raw.replace("%", "").trim()) : raw;
  if (isNaN(num)) return String(raw);
  const rounded = Math.round(num * 100) / 100;
  const isWhole = Math.abs(rounded) % 1 === 0;
  return `${rounded.toFixed(isWhole ? 1 : 2).replace(/\.00$/, ".0")}%`;
}

export function formatMacroValue(raw: number | string): string {
  return formatCleanMacroPercent(raw);
}
