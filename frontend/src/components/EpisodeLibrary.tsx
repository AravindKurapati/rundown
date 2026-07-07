import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { EpisodeSummary } from "../types";
import Player from "./Player";

// Full episode detail returned by GET /episodes/{id}. types.ts only defines the
// summary shape used by GET /episodes, so the fields Player/EpisodeLibrary need
// beyond the summary are declared locally here.
interface EpisodeDetail {
  id: number;
  status: string;
  transcript_json: string | null;
}

interface EpisodeLibraryProps {
  refreshToken: number;
  autoExpandId?: number | null;
}

const STATUS_STYLES: Record<string, string> = {
  ready: "bg-green-100 text-green-800",
  generating: "bg-blue-100 text-blue-800",
  pending: "bg-gray-100 text-gray-700",
  failed: "bg-red-100 text-red-800",
};

function statusBadgeClass(status: string): string {
  return STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700";
}

export default function EpisodeLibrary({ refreshToken, autoExpandId }: EpisodeLibraryProps) {
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<EpisodeDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const list = (await api.listEpisodes()) as EpisodeSummary[];
      if (!cancelled) {
        setEpisodes(list);
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  useEffect(() => {
    if (autoExpandId == null) return;
    void expand(autoExpandId);
    // Intentionally only reacts to autoExpandId changing (Studio bumps it once
    // per freshly generated episode); re-running on every render would fight
    // the user's own expand/collapse clicks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoExpandId]);

  async function expand(id: number) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetail(null);
    const full = (await api.getEpisode(id)) as EpisodeDetail;
    setDetail(full);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Past episodes</h2>

      {!loading && episodes.length === 0 && (
        <p className="text-sm text-gray-500">Everything you make will pile up here.</p>
      )}

      {episodes.length > 0 && (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {episodes.map((ep) => (
            <li key={ep.id}>
              <button
                type="button"
                onClick={() => void expand(ep.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-900">
                  {ep.title || `Episode ${ep.id}`}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(ep.status)}`}
                >
                  {ep.status}
                </span>
              </button>

              {expandedId === ep.id && (
                <div className="border-t border-gray-100 px-4 py-4">
                  {detail && detail.id === ep.id ? (
                    <Player episodeId={ep.id} transcriptJson={detail.transcript_json} />
                  ) : (
                    <p className="text-sm text-gray-400">Loading...</p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
