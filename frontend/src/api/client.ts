const BASE = "http://localhost:8000/api";
async function j<T>(r: Response): Promise<T> { if (!r.ok) throw new Error(String(r.status)); return r.json(); }
export const api = {
  getPreferences: () => fetch(`${BASE}/preferences`).then(j),
  putPreferences: (b: unknown) => fetch(`${BASE}/preferences`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(j),
  estimate: () => fetch(`${BASE}/episodes/estimate`).then(j),
  generate: () => fetch(`${BASE}/episodes/generate`, { method: "POST" }).then(j),
  listEpisodes: () => fetch(`${BASE}/episodes`).then(j),
  getEpisode: (id: number) => fetch(`${BASE}/episodes/${id}`).then(j),
  audioUrl: (id: number) => `${BASE}/episodes/${id}/audio`,
  getSchedule: () => fetch(`${BASE}/schedule`).then(j),
  listVoices: () => fetch(`${BASE}/voices`).then(j),
  putSchedule: (b: unknown) => fetch(`${BASE}/schedule`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(j),
  overview: () => fetch(`${BASE}/metrics/overview`).then(j),
  timeseries: (metric: string, days = 30) => fetch(`${BASE}/metrics/timeseries?metric=${metric}&days=${days}`).then(j),
  pipeline: () => fetch(`${BASE}/metrics/pipeline`).then(j),
};
