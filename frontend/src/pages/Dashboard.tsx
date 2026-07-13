import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import MetricCard from "../components/MetricCard";
import PipelineStrip from "../components/PipelineStrip";
import type { Overview, Point } from "../types";

const INTRO =
  "Real numbers from real runs, plus a few we made up. We'll always tell you which is which.";
const EMPTY_STATE =
  "No runs yet. Make an episode in the Studio and the real numbers show up here.";

const MONO_TICK = { fontSize: 11, fill: "var(--muted)", fontFamily: "IBM Plex Mono, monospace" };
const TOOLTIP_STYLE = {
  background: "var(--bg2)",
  border: "1px solid var(--line)",
  borderRadius: 10,
  color: "var(--ink)",
  fontFamily: "IBM Plex Mono, monospace",
};

interface ListenersPoint {
  date: string;
  dau: number;
  wau: number;
}

function mergeListeners(dauSeries: Point[], wauSeries: Point[]): ListenersPoint[] {
  const wauByDate = new Map(wauSeries.map((p) => [p.date, p.value]));
  return dauSeries.map((p) => ({ date: p.date, dau: p.value, wau: wauByDate.get(p.date) ?? 0 }));
}

// Small hairline "MOCK DATA" tag with broadcast-test diagonal stripes.
function MockBadge() {
  return (
    <span
      className="inline-flex items-center rounded-md border border-gold px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-gold"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, var(--amber-soft) 0 4px, transparent 4px 8px)",
      }}
    >
      Mock data
    </span>
  );
}

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [listeners, setListeners] = useState<ListenersPoint[]>([]);
  const [ltrSeries, setLtrSeries] = useState<Point[]>([]);

  useEffect(() => {
    void (async () => {
      const ov = (await api.overview()) as Overview;
      setOverview(ov);
      const dauSeries = (await api.timeseries("dau")) as Point[];
      const wauSeries = (await api.timeseries("wau")) as Point[];
      setListeners(mergeListeners(dauSeries, wauSeries));
      const ltr = (await api.timeseries("listen_through_rate")) as Point[];
      setLtrSeries(ltr);
    })();
  }, []);

  const pct = overview?.budget_used_pct ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-10">
      <div>
        <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
          <span className="live-dot" aria-hidden="true" />
          Control room
        </p>
        <h1 className="wordmark text-5xl font-normal">THE NUMBERS</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">{INTRO}</p>
      </div>

      {!overview && <p className="font-mono text-sm text-muted">Loading dashboard…</p>}

      {overview && overview.episodes === 0 && <p className="text-sm text-muted">{EMPTY_STATE}</p>}

      {overview && overview.episodes > 0 && (
        <>
          <PipelineStrip />

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard index={1} label="Episodes" value={String(overview.episodes)} />
            <MetricCard
              index={2}
              label="Success rate"
              value={`${Math.round(overview.success_rate * 100)}%`}
            />
            <MetricCard
              index={3}
              label="Avg make time"
              value={`${(overview.avg_latency_ms / 1000).toFixed(1)} s`}
            />
            <MetricCard
              index={4}
              label="Chars read"
              value={overview.tts_chars_total.toLocaleString()}
            />
            <MetricCard
              index={5}
              label="Est. cost"
              value={`$${overview.est_cost_total_usd.toFixed(2)}`}
              sublabel={`of $${overview.budget_cap_usd.toFixed(2)} cap`}
              meterPct={pct}
              tag={pct >= 80 ? `${pct}% OF CAP` : undefined}
              warn={pct >= 80}
            />
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <h2 className="wordmark text-xl text-ink">Product analytics</h2>
              <MockBadge />
            </div>

            <div className="rounded-2xl border border-line bg-bg2 p-6">
              <div className="mb-4 flex items-center gap-3">
                <h3 className="wordmark text-lg text-ink">Daily &amp; weekly listeners</h3>
                <MockBadge />
              </div>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={listeners}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="date" tick={MONO_TICK} stroke="var(--line)" />
                    <YAxis tick={MONO_TICK} stroke="var(--line)" />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "var(--muted)" }} />
                    <Legend />
                    <Line type="monotone" dataKey="dau" name="Daily active" stroke="var(--amber)" strokeDasharray="4 4" dot={false} />
                    <Line type="monotone" dataKey="wau" name="Weekly active" stroke="var(--teal)" strokeDasharray="4 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-bg2 p-6">
              <div className="mb-4 flex items-center gap-3">
                <h3 className="wordmark text-lg text-ink">Listen-through rate</h3>
                <MockBadge />
              </div>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ltrSeries}>
                    <defs>
                      <linearGradient id="ltrFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="var(--violet)" stopOpacity="0.28" />
                        <stop offset="1" stopColor="var(--violet)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="date" tick={MONO_TICK} stroke="var(--line)" />
                    <YAxis tick={MONO_TICK} stroke="var(--line)" />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "var(--muted)" }} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="Listen-through rate"
                      stroke="var(--violet)"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      fill="url(#ltrFill)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-faint">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-0 w-5 border-t-2 border-dashed"
                    style={{ borderColor: "var(--violet)" }}
                  />
                  Listen-through rate (%)
                </span>
                <span>·</span>
                <span>Source: mock analytics engine</span>
                <span>·</span>
                <span>Granularity: 1 min</span>
                <span>·</span>
                <span>TZ: local</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
