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
    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
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
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">{INTRO}</p>
      </div>

      {!overview && <p className="text-sm text-gray-500">Loading dashboard...</p>}

      {overview && overview.episodes === 0 && (
        <p className="text-sm text-gray-500">{EMPTY_STATE}</p>
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
              <h2 className="text-lg font-semibold">Product analytics</h2>
              <MockBadge />
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center gap-3">
                <h3 className="text-sm font-medium text-gray-900">Daily and weekly listeners</h3>
                <MockBadge />
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={listeners}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="dau"
                      name="Daily active"
                      stroke="#d97706"
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="wau"
                      name="Weekly active"
                      stroke="#92400e"
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center gap-3">
                <h3 className="text-sm font-medium text-gray-900">Listen-through rate</h3>
                <MockBadge />
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ltrSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Listen-through rate"
                      stroke="#d97706"
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
