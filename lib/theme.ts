// Single source of truth for color tokens. The root layout turns these into
// CSS variables, and app/globals.css maps those variables into Tailwind, so
// components use classes like `bg-surface` or `text-accent`, never raw hex.

export const tokenNames = [
  "background",
  "surface",
  "surfaceRaised",
  "border",
  "text",
  "textMuted",
  "accent",
  "accentText",
  "success",
  "warning",
  "danger",
] as const;

export type TokenName = (typeof tokenNames)[number];
export type Palette = Record<TokenName, string>;

// "Night at the inn" (default)
export const dark: Palette = {
  background: "#14110F",
  surface: "#1E1A16",
  surfaceRaised: "#27221D",
  border: "#3A322A",
  text: "#EDE3CF",
  textMuted: "#B3A68C",
  accent: "#D4A84B",
  accentText: "#14110F",
  success: "#6FBF73",
  warning: "#E0A458",
  danger: "#D9674F",
};

// Parchment
export const light: Palette = {
  background: "#F4ECDC",
  surface: "#FBF6EC",
  surfaceRaised: "#FFFFFF",
  border: "#DDD0B8",
  text: "#2A2118",
  textMuted: "#6B5D48",
  accent: "#875F12",
  accentText: "#FFFFFF",
  success: "#2F7135",
  warning: "#8F5815",
  danger: "#A63A24",
};

// Item quality colors: only for labeling gear suggestions inside a plan.
export const quality = {
  common: "#EDE3CF",
  uncommon: "#4FC25B",
  rare: "#3D8FE0",
  epic: "#A86FE0",
} as const;

// "surfaceRaised" -> "surface-raised", used for CSS variable names.
export function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

function cssVars(palette: Palette): string {
  return tokenNames.map((name) => `--${kebab(name)}:${palette[name]};`).join("");
}

// Dark is the default; `data-theme="light"` on <html> switches to parchment.
export function themeCss(): string {
  return `:root{${cssVars(dark)}color-scheme:dark}:root[data-theme="light"]{${cssVars(light)}color-scheme:light}`;
}

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
