import { useEffect, useRef, useState } from "react";
import EpisodeCover from "./EpisodeCover";

interface AudioPlayerProps {
  src: string;
  title: string;
  seed: number;
  durationHint?: number | null;
}

const RATES = [1, 1.25, 1.5, 2];

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Designed player: generative cover + title + a real, keyboard-seekable scrubber
// wrapping a native <audio> (kept for correctness; the custom chrome replaces
// the browser's default bar).
export default function AudioPlayer({ src, title, seed, durationHint }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCur(el.currentTime);
    const onMeta = () => setDur(el.duration);
    const onEnd = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
    };
  }, [src]);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.playbackRate = rate;
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  function cycleRate() {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  function seek(value: number) {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = value;
    setCur(value);
  }

  // Prefer the audio element's real duration; fall back to the value we already
  // know from the episode record so the total shows before metadata loads.
  const total = dur > 0 ? dur : durationHint ?? 0;
  const pct = total > 0 ? (cur / total) * 100 : 0;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-bg3 p-3 sm:p-4">
      <EpisodeCover
        seed={seed}
        live={playing}
        className="h-16 w-16 flex-shrink-0 rounded-xl sm:h-20 sm:w-20"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{title}</p>

        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            aria-pressed={playing}
            className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-air text-white shadow-[var(--glow)] transition-transform hover:scale-105"
          >
            <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
          </button>

          <input
            type="range"
            className="player-range flex-1"
            min={0}
            max={total || 0}
            step={0.1}
            value={cur}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek"
            style={{ ["--pct" as string]: `${pct}%` }}
          />

          <span className="w-20 flex-shrink-0 text-right font-mono text-xs tabular-nums text-muted">
            {fmt(cur)} / {fmt(total)}
          </span>

          <button
            type="button"
            onClick={cycleRate}
            aria-label={`Playback speed ${rate} times`}
            className="flex-shrink-0 rounded-full border border-line px-2.5 py-1 font-mono text-xs font-semibold text-muted transition-colors hover:border-amber hover:text-ink"
          >
            {rate}×
          </button>
        </div>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" className="hidden">
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}
