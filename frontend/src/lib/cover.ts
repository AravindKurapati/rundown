// Deterministic generative cover art for episodes. An episode's numeric id is
// the only seed, so a given episode always renders the same cover — no stored
// image, no asset pipeline, honest to a text-to-speech product that has no real
// artwork of its own.

export type Palette = { from: string; to: string; glow: string };

// Warm-led but varied, so a library of episodes reads colorful without any one
// cover fighting the booth palette.
const PALETTES: Palette[] = [
  { from: "#f0b154", to: "#ee5a3d", glow: "#ffd68a" }, // amber → coral (brand)
  { from: "#ee5a3d", to: "#9c2c63", glow: "#ff9a7a" }, // coral → magenta
  { from: "#7c5cff", to: "#332a7a", glow: "#b9a6ff" }, // violet → indigo
  { from: "#2fb6a0", to: "#125a4c", glow: "#8ff0dd" }, // teal → green
  { from: "#f0a35a", to: "#7a3d17", glow: "#ffd0a0" }, // gold → umber
  { from: "#ff7aa8", to: "#6d2a7a", glow: "#ffc2d8" }, // rose → plum
];

// mulberry32 — tiny deterministic PRNG.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CoverData {
  palette: Palette;
  bars: number[]; // 0..1 heights for the waveform motif
  angle: number; // gradient angle in degrees
}

export function coverFor(seed: number, barCount = 14): CoverData {
  const s = Math.abs(Math.floor(seed)) + 1;
  const next = rng(s);
  const palette = PALETTES[s % PALETTES.length];
  const bars = Array.from({ length: barCount }, () => 0.25 + next() * 0.7);
  const angle = Math.floor(next() * 120) + 20;
  return { palette, bars, angle };
}
