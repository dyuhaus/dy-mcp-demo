export const tokens = {
  bg: "#f5f0e6",
  paper: "#fbf7ee",
  ink: "#2a2218",
  faint: "#8a7e6a",
  rule: "#d9cfba",
  ruleStrong: "#b8a888",
  accent: "#b05a32",
  accentSoft: "#e9dcc8",
  green: "#6b7d3f",
  serif: "'Instrument Serif', 'Iowan Old Style', Georgia, serif",
  sans: "'Inter', -apple-system, system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
} as const;

export type Tokens = typeof tokens;
