import { useEffect, useRef, useState } from "react";
import EpisodeCover from "./EpisodeCover";

interface AudioPlayerProps {
  src: string;
  title: string;
  seed: number;
  durationHint?: number | null;
  date?: string | null;
  onProgress?: (current: number, duration: number) => void;
}

const RATES = [1, 1.25, 1.5, 2];
const STATION = "FM 89.7"; // decorative station call-sign (brand dressing)

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Designed player, styled as an on-air deck: generative cover + Anton title +
// mono readouts + transport controls. Wraps a hidden native <audio>.
export default function AudioPlayer({ src, title, seed, durationHint, date, onProgress }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [rate, setRate] = useState(1);

  // Keep the latest callback in a ref so the (src-scoped) listener effect always
  // calls the current one without re-subscribing on every render.
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      setCur(el.currentTime);
      onProgressRef.current?.(el.currentTime, el.duration || 0);
    };
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

  function skip(delta: number) {
    const el = audioRef.current;
    if (!el) return;
    const t = Math.max(0, el.currentTime + delta);
    el.currentTime = t;
    setCur(t);
  }

  const total = dur > 0 ? dur : durationHint ?? 0;
  const pct = total > 0 ? (cur / total) * 100 : 0;
  const skipBtn =
    "rounded-md border border-line px-3 py-2 font-mono text-xs font-semibold text-muted transition-colors hover:border-amber hover:text-ink";

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-bg2">
      <div className="flex flex-col sm:flex-row">
        <div className="border-b border-line bg-bg3 sm:w-[30%] sm:border-b-0 sm:border-r">
          <EpisodeCover seed={seed} live={playing} className="h-44 w-full sm:h-full" />
        </div>

        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
            <span className={playing ? "text-coral" : undefined}>On air</span>
            <span>{STATION}</span>
          </div>

          <div className="mt-2 flex items-start justify-between gap-3">
            <h3 className="wordmark min-w-0 truncate pb-0.5 text-2xl leading-tight text-ink sm:text-[28px]">
              {title}
            </h3>
            {playing && (
              <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md border border-air px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-air">
                <span className="h-1.5 w-1.5 rounded-full bg-air" />
                Live
              </span>
            )}
          </div>

          {date && <p className="mt-1.5 font-mono text-xs text-faint">{fmtDate(date)}</p>}

          <div className="mt-4 flex items-center gap-3">
            <span className="w-10 font-mono text-xs tabular-nums text-muted">{fmt(cur)}</span>
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
            <span className="w-10 text-right font-mono text-xs tabular-nums text-muted">
              {fmt(total)}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="font-mono leading-tight">
              <p className="text-[10px] uppercase tracking-[0.16em] text-faint">Rundown</p>
              <p className="text-xs font-semibold text-amber">{STATION}</p>
            </div>

            <div className="flex items-center gap-2.5">
              <button type="button" onClick={() => skip(-15)} aria-label="Back 15 seconds" className={skipBtn}>
                −15
              </button>
              <button
                type="button"
                onClick={toggle}
                aria-label={playing ? "Pause" : "Play"}
                aria-pressed={playing}
                className="grid h-12 w-12 place-items-center rounded-full bg-ink text-bg transition-transform hover:scale-105"
              >
                <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
              </button>
              <button type="button" onClick={() => skip(15)} aria-label="Forward 15 seconds" className={skipBtn}>
                +15
              </button>
              <button
                type="button"
                onClick={cycleRate}
                aria-label={`Playback speed ${rate} times`}
                className="rounded-md border border-line px-2.5 py-2 font-mono text-xs font-semibold text-muted transition-colors hover:border-amber hover:text-ink"
              >
                {rate}×
              </button>
            </div>
          </div>
        </div>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" className="hidden">
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}
