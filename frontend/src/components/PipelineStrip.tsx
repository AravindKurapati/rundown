import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { PipelineRun } from "../types";

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function fmtRunAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Per-stage telemetry for the last run, from real generation_event data. The bar
// under each stage is the stage's share of the run's slowest stage (honest
// relative latency), not a fabricated time series.
export default function PipelineStrip() {
  const [run, setRun] = useState<PipelineRun | null>(null);

  useEffect(() => {
    void (async () => setRun((await api.pipeline()) as PipelineRun))();
  }, []);

  if (!run || run.stages.length === 0) return null;

  const maxMs = Math.max(...run.stages.map((s) => s.duration_ms), 1);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-bg2">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
          Pipeline · last run
        </p>
        <p className="font-mono text-xs text-muted">{fmtRunAt(run.run_at)}</p>
      </div>

      <div className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
        {run.stages.map((s, i) => (
          <div key={s.stage} className="border-b border-line p-4 sm:border-b-0">
            <p className="font-mono text-[11px] text-faint">{String(i + 1).padStart(2, "0")}</p>
            <h4 className="wordmark mt-1 text-lg leading-none text-ink">{s.stage}</h4>
            <p
              className={`mt-2 font-mono text-2xl tabular-nums ${s.ok ? "text-ink" : "text-air"}`}
            >
              {fmtMs(s.duration_ms)}
            </p>
            <div className="mt-3 h-1 rounded-full bg-line">
              <div
                className="h-full rounded-full bg-amber"
                style={{ width: `${Math.max(3, (s.duration_ms / maxMs) * 100)}%` }}
              />
            </div>
            <p className="mt-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
              <span
                className={`h-1.5 w-1.5 rounded-full ${s.ok ? "bg-good" : "bg-air"}`}
                aria-hidden="true"
              />
              <span className={s.ok ? "text-good" : "text-air"}>{s.ok ? "OK" : "FAILED"}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
