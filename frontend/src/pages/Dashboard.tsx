import { useEffect, useState } from "react";
import {
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
import type { Overview, Point } from "../types";

const INTRO =
  "Real numbers from real runs, plus a few we made up. We'll always tell you which is which.";
const EMPTY_STATE =
  "No runs yet. Make an episode in the Studio and the real numbers show up here.";
const MOCK_BADGE_TEXT = "Mock data, not real";

interface ListenersPoint {
  date: string;
  dau: number;
  wau: number;
}

function mergeListeners(dauSeries: Point[], wauSeries: Point[]): ListenersPoint[] {
  const wauByDate = new Map(wauSeries.map((p) => [p.date, p.value]));
  return dauSeries.map((p) => ({
    date: p.date,
    dau: p.value,
    wau: wauByDate.get(p.date) ?? 0,
  }));
}

function MockBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-[var(--amber-soft)] px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-amber">
      {MOCK_BADGE_TEXT}
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

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-10">
      <div>
        <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
          <span className="live-dot" aria-hidden="true" />
          Control room
        </p>
        <h1 className="wordmark text-5xl font-normal">THE NUMBERS</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">{INTRO}</p>
      </div>

      {!overview && <p className="font-mono text-sm text-muted">Loading dashboard…</p>}

      {overview && overview.episodes === 0 && (
        <p className="text-sm text-muted">{EMPTY_STATE}</p>
      )}

      {overview && overview.episodes > 0 && (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Episodes made" value={String(overview.episodes)} />
            <MetricCard
              label="Success rate"
              value={`${Math.round(overview.success_rate * 100)}%`}
            />
            <MetricCard
              label="Avg time to make one"
              value={`${(overview.avg_latency_ms / 1000).toFixed(1)}s`}
            />
            <MetricCard
              label="Characters read aloud"
              value={overview.tts_chars_total.toLocaleString()}
            />
            <MetricCard
              label="Estimated cost"
              value={`$${overview.est_cost_total_usd.toFixed(2)}`}
            />
            <MetricCard
              label="Budget used"
              value={`${overview.budget_used_pct}%`}
              sublabel={`of $${overview.budget_cap_usd.toFixed(2)}`}
              warn={overview.budget_used_pct >= 80}
            />
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-ink">Product analytics</h2>
              <MockBadge />
            </div>

            <div className="rounded-2xl border border-line bg-bg2 p-6">
              <div className="mb-4 flex items-center gap-3">
                <h3 className="text-sm font-semibold text-ink">Daily and weekly listeners</h3>
                <MockBadge />
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={listeners}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--muted)" }} stroke="var(--line)" />
                    <YAxis tick={{ fontSize: 12, fill: "var(--muted)" }} stroke="var(--line)" />
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg2)",
                        border: "1px solid var(--line)",
                        borderRadius: 10,
                        color: "var(--ink)",
                      }}
                      labelStyle={{ color: "var(--muted)" }}
                      itemStyle={{ color: "var(--ink)" }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="dau"
                      name="Daily active"
                      stroke="var(--amber)"
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="wau"
                      name="Weekly active"
                      stroke="var(--good)"
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-bg2 p-6">
              <div className="mb-4 flex items-center gap-3">
                <h3 className="text-sm font-semibold text-ink">Listen-through rate</h3>
                <MockBadge />
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ltrSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--muted)" }} stroke="var(--line)" />
                    <YAxis tick={{ fontSize: 12, fill: "var(--muted)" }} stroke="var(--line)" />
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg2)",
                        border: "1px solid var(--line)",
                        borderRadius: 10,
                        color: "var(--ink)",
                      }}
                      labelStyle={{ color: "var(--muted)" }}
                      itemStyle={{ color: "var(--ink)" }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Listen-through rate"
                      stroke="var(--amber)"
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
