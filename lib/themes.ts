/**
 * Color themes. The palettes themselves live in app/globals.css as CSS
 * variables under `[data-theme="…"]`; this module only describes them for the
 * picker and for the browser chrome color.
 */
export const THEMES = [
  {
    id: "felt",
    label: "Felt",
    description: "Emerald and gold",
    swatch: ["#0d1714", "#34d399", "#f2c35e"],
    themeColor: "#070d0b",
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Indigo night",
    swatch: ["#0e1221", "#8f9cff", "#f2c35e"],
    themeColor: "#080b15",
  },
  {
    id: "daylight",
    label: "Daylight",
    description: "For bright rooms and projectors",
    swatch: ["#ffffff", "#047857", "#a16207"],
    themeColor: "#edf2ef",
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "felt";
export const THEME_STORAGE_KEY = "poker-theme";

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function themeColorFor(id: ThemeId): string {
  return THEMES.find((t) => t.id === id)?.themeColor ?? THEMES[0].themeColor;
}

/**
 * Runs synchronously in <head> so the saved theme is applied before first
 * paint (no flash of the default palette on reload).
 */
export const themeBootScript = `(function(){try{var c=${JSON.stringify(
  Object.fromEntries(THEMES.map((t) => [t.id, t.themeColor])),
)};var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(!c[t])return;document.documentElement.setAttribute("data-theme",t);document.addEventListener("DOMContentLoaded",function(){var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",c[t])})}catch(e){}})()`;
