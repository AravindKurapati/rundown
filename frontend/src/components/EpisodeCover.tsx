import { useMemo } from "react";
import { coverFor } from "../lib/cover";

interface EpisodeCoverProps {
  seed: number;
  className?: string;
  live?: boolean; // animate the waveform (e.g. while generating / playing)
}

// A square, self-contained SVG cover: seeded gradient + a waveform motif + a
// soft light source. Deterministic per seed (see lib/cover).
export default function EpisodeCover({ seed, className, live }: EpisodeCoverProps) {
  const { palette, bars, angle } = useMemo(() => coverFor(seed), [seed]);
  const gid = `cov-g-${seed}`;
  const rid = `cov-r-${seed}`;
  const barW = 100 / (bars.length * 2);

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
        <radialGradient id={rid} cx="0.75" cy="0.2" r="0.9">
          <stop offset="0" stopColor={palette.glow} stopOpacity="0.55" />
          <stop offset="0.6" stopColor={palette.glow} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="100" height="100" fill={`url(#${gid})`} />
      <rect width="100" height="100" fill={`url(#${rid})`} />

      <g className={live ? "cover-wave cover-wave--live" : "cover-wave"}>
        {bars.map((h, i) => {
          const x = 50 + (i - bars.length / 2) * barW * 2 + barW / 2;
          const height = h * 46;
          return (
            <rect
              key={i}
              x={x}
              y={50 - height / 2}
              width={barW}
              height={height}
              rx={barW / 2}
              fill="#fff"
              fillOpacity={0.9}
              style={{ transformOrigin: "center", animationDelay: `${i * 0.07}s` }}
            />
          );
        })}
      </g>
    </svg>
  );
}
