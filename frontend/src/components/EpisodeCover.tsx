import { useMemo } from "react";
import { coverFor } from "../lib/cover";

interface EpisodeCoverProps {
  seed: number;
  className?: string;
  live?: boolean; // animate the waveform (e.g. while generating / playing)
}

// A square, self-contained SVG cover: a seeded gradient, concentric "signal"
// rings from a light source, a depth vignette, and a waveform along the base.
// Deterministic per seed (see lib/cover).
export default function EpisodeCover({ seed, className, live }: EpisodeCoverProps) {
  const { palette, angle, bars, rings, originX, originY } = useMemo(
    () => coverFor(seed),
    [seed]
  );
  const gid = `cov-g-${seed}`;
  const rid = `cov-r-${seed}`;
  const vid = `cov-v-${seed}`;
  const barW = 100 / (bars.length * 1.7);
  const gap = (100 - barW * bars.length) / (bars.length + 1);

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Episode cover art"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={gid} gradientTransform={`rotate(${angle} 0.5 0.5)`}>
          <stop offset="0" stopColor={palette.from} />
          <stop offset="1" stopColor={palette.to} />
        </linearGradient>
        <radialGradient id={rid} cx={originX / 100} cy={originY / 100} r="0.85">
          <stop offset="0" stopColor={palette.glow} stopOpacity="0.6" />
          <stop offset="0.6" stopColor={palette.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={vid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.32" />
        </linearGradient>
      </defs>

      <rect width="100" height="100" fill={`url(#${gid})`} />

      {/* concentric signal rings radiating from the light source */}
      <g fill="none" stroke="#fff" strokeOpacity="0.16">
        {rings.map((r, i) => (
          <circle key={i} cx={originX} cy={originY} r={r} strokeWidth="0.6" />
        ))}
      </g>

      <rect width="100" height="100" fill={`url(#${rid})`} />
      <rect width="100" height="100" fill={`url(#${vid})`} />

      {/* waveform anchored to the base, like a real transport */}
      <g className={live ? "cover-wave cover-wave--live" : "cover-wave"}>
        {bars.map((h, i) => {
          const x = gap + i * (barW + gap);
          const height = 8 + h * 40;
          return (
            <rect
              key={i}
              x={x}
              y={86 - height}
              width={barW}
              height={height}
              rx={barW / 2}
              fill="#fff"
              fillOpacity={0.92}
              style={{ transformOrigin: "center bottom", animationDelay: `${i * 0.05}s` }}
            />
          );
        })}
      </g>
    </svg>
  );
}
