// Deterministic generative cover art for episodes. An episode's numeric id is
// the only seed, so a given episode always renders the same cover — no stored
// image, no asset pipeline, honest to a text-to-speech product that has no real
// artwork of its own. The composition layers a seeded gradient, concentric
// "signal" rings from a light source, and a waveform along the base.

export type Palette = { from: string; to: string; glow: string };

// Warm-led but varied and deep, so a library of episodes reads colorful and
// designed without any one cover fighting the booth palette.
const PALETTES: Palette[] = [
  { from: "#f0b154", to: "#ee5a3d", glow: "#ffd68a" }, // amber → coral (brand)
  { from: "#ee5a3d", to: "#7a1f52", glow: "#ff9a7a" }, // coral → wine
  { from: "#7c5cff", to: "#241b5e", glow: "#b9a6ff" }, // violet → indigo
  { from: "#2fb6a0", to: "#0e463c", glow: "#8ff0dd" }, // teal → deep green
  { from: "#f0a35a", to: "#5e2c12", glow: "#ffd0a0" }, // gold → umber
  { from: "#ff7aa8", to: "#5a2168", glow: "#ffc2d8" }, // rose → plum
  { from: "#5aa6ff", to: "#16305e", glow: "#bfe0ff" }, // sky → navy
  { from: "#e8d24a", to: "#7a5312", glow: "#fff0a0" }, // sun → bronze
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
  angle: number; // gradient angle in degrees
  bars: number[]; // 0..1 heights for the base waveform
  rings: number[]; // ring radii (SVG units) radiating from the light source
  originX: number; // light-source / ring origin, 0..100
  originY: number;
}

export function coverFor(seed: number, barCount = 20): CoverData {
  const s = Math.abs(Math.floor(seed)) + 1;
  const next = rng(s);
  const palette = PALETTES[s % PALETTES.length];
  const angle = Math.floor(next() * 140) + 20;
  const bars = Array.from({ length: barCount }, () => 0.18 + next() * 0.82);
  const originX = 24 + Math.floor(next() * 60);
  const originY = 12 + Math.floor(next() * 26);
  const ringCount = 3 + Math.floor(next() * 3); // 3..5
  const rings = Array.from(
    { length: ringCount },
    (_, i) => 26 + i * 20 + Math.floor(next() * 8)
  );
  return { palette, angle, bars, rings, originX, originY };
}
