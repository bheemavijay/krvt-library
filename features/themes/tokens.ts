import type { AppAccentColor, AppThemeMode } from "@/types";

export type KrvtThemeTokens = {
  background: string;
  foreground: string;
  panel: string;
  panelStrong: string;
  border: string;
  accent: string;
  accentSoft: string;
  shadow: string;
};

export const APP_THEME_TOKENS: Record<AppThemeMode, KrvtThemeTokens> = {
  dark: {
    background: "#0f1115",
    foreground: "#f8fafc",
    panel: "rgba(18, 19, 24, 0.78)",
    panelStrong: "#121318",
    border: "rgba(255, 255, 255, 0.1)",
    accent: "#d4b16a",
    accentSoft: "rgba(212, 177, 106, 0.16)",
    shadow: "0 24px 70px rgba(0, 0, 0, 0.38)",
  },
  black: {
    background: "#000000",
    foreground: "#f6f6f6",
    panel: "rgba(10, 10, 10, 0.86)",
    panelStrong: "#080808",
    border: "rgba(255, 255, 255, 0.12)",
    accent: "#d4b16a",
    accentSoft: "rgba(212, 177, 106, 0.14)",
    shadow: "0 24px 70px rgba(0, 0, 0, 0.58)",
  },
  "gold-black": {
    background: "#070604",
    foreground: "#f8f1df",
    panel: "rgba(19, 16, 10, 0.86)",
    panelStrong: "#12100a",
    border: "rgba(224, 188, 82, 0.22)",
    accent: "#e0bc52",
    accentSoft: "rgba(224, 188, 82, 0.18)",
    shadow: "0 24px 76px rgba(0, 0, 0, 0.52)",
  },
  "silver-graphite": {
    background: "#0c0f12",
    foreground: "#edf1f5",
    panel: "rgba(22, 26, 30, 0.84)",
    panelStrong: "#15191d",
    border: "rgba(202, 211, 221, 0.18)",
    accent: "#cbd5df",
    accentSoft: "rgba(203, 213, 223, 0.15)",
    shadow: "0 24px 72px rgba(0, 0, 0, 0.42)",
  },
};

export const APP_ACCENT_COLORS: Record<AppAccentColor, string> = {
  gold: "#d4b16a",
  purple: "#9d4edd",
  crimson: "#e63946",
};

export function getAppThemeTokens(themeMode: AppThemeMode, accentColor: AppAccentColor) {
  const baseTokens = APP_THEME_TOKENS[themeMode] ?? APP_THEME_TOKENS.dark;
  const accent = themeMode === "gold-black" || themeMode === "silver-graphite"
    ? baseTokens.accent
    : APP_ACCENT_COLORS[accentColor] ?? baseTokens.accent;

  return {
    ...baseTokens,
    accent,
    accentSoft: hexToRgba(accent, 0.16),
  };
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return `rgba(212, 177, 106, ${alpha})`;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
