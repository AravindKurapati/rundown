import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { EpisodeSummary } from "../types";
import EpisodeCover from "./EpisodeCover";
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
  ready: "border-good text-good",
  generating: "border-amber text-amber",
  pending: "border-line text-muted",
  failed: "border-air text-air",
};

function statusBadgeClass(status: string): string {
  return STATUS_STYLES[status] ?? "border-line text-muted";
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)} min`;
}

function metaLine(ep: EpisodeSummary): string {
  const date = ep.created_at ? new Date(ep.created_at).toLocaleDateString() : "";
  const dur = ep.duration_seconds != null ? formatDuration(ep.duration_seconds) : null;
  return [date, dur].filter(Boolean).join(" · ");
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
      <div className="mb-1 flex items-center gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
          Past episodes
        </p>
        <span className="h-px flex-1 bg-line" />
      </div>

      {!loading && episodes.length === 0 && (
        <p className="text-sm text-muted">Everything you make will pile up here.</p>
      )}

      {episodes.length > 0 && (
        <ul className="space-y-3">
          {episodes.map((ep) => {
            const title = ep.title || `Episode ${ep.id}`;
            const open = expandedId === ep.id;
            return (
              <li
                key={ep.id}
                className="overflow-hidden rounded-2xl border border-line bg-bg2 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => void expand(ep.id)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-4 p-3 text-left transition-colors hover:bg-bg3"
                >
                  <EpisodeCover
                    seed={ep.id}
                    live={ep.status === "generating"}
                    className="h-14 w-14 flex-shrink-0 rounded-xl"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{title}</span>
                    <span className="mt-0.5 block font-mono text-[11px] text-faint">
                      {metaLine(ep)}
                    </span>
                  </span>
                  <span
                    className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide ${statusBadgeClass(ep.status)}`}
                  >
                    {ep.status}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`flex-shrink-0 text-faint transition-transform ${open ? "rotate-180" : ""}`}
                  >
                    ⌄
                  </span>
                </button>

                {open && (
                  <div className="border-t border-line p-3 sm:p-4">
                    {detail && detail.id === ep.id ? (
                      <Player
                        episodeId={ep.id}
                        title={title}
                        transcriptJson={detail.transcript_json}
                        durationSeconds={ep.duration_seconds}
                      />
                    ) : (
                      <p className="text-sm text-faint">Loading…</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
