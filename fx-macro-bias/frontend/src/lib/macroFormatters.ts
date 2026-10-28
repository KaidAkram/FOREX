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

export const SOVEREIGN_TO_FRENCH: Record<string, string> = {
  USA: "États-Unis",
  "United States": "États-Unis",
  "États-Unis": "États-Unis",
  USD: "États-Unis",
  "Euro Area": "Zone Euro",
  "Zone Euro": "Zone Euro",
  EUR: "Zone Euro",
  Japan: "Japon",
  Japon: "Japon",
  JPY: "Japon",
  "United Kingdom": "Royaume-Uni",
  "Royaume-Uni": "Royaume-Uni",
  UK: "Royaume-Uni",
  GBP: "Royaume-Uni",
  Australia: "Australie",
  Australie: "Australie",
  AUD: "Australie",
  Canada: "Canada",
  CAD: "Canada",
  Switzerland: "Suisse",
  Suisse: "Suisse",
  CHF: "Suisse",
  "New Zealand": "Nouvelle-Zélande",
  "Nouvelle-Zélande": "Nouvelle-Zélande",
  NZD: "Nouvelle-Zélande",
  Sweden: "Suède",
  Suède: "Suède",
  SEK: "Suède",
  Norway: "Norvège",
  Norvège: "Norvège",
  NOK: "Norvège",
};

export function getCountryFrenchName(nameOrCode: string): string {
  if (!nameOrCode) return "";
  const key = nameOrCode.trim();
  return SOVEREIGN_TO_FRENCH[key] || SOVEREIGN_TO_FRENCH[key.toUpperCase()] || nameOrCode;
}

export function formatPairCountriesFr(pair: string, baseCountry?: string, quoteCountry?: string): string {
  if (baseCountry && quoteCountry) {
    return `${getCountryFrenchName(baseCountry)} / ${getCountryFrenchName(quoteCountry)}`;
  }
  const [b, q] = pair.split("/");
  return `${getCountryFrenchName(b)} / ${getCountryFrenchName(q)}`;
}

