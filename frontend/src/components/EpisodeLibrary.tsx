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

interface StatusChip {
  label: string;
  cls: string;
  dot?: boolean;
}

const STATUS: Record<string, StatusChip> = {
  ready: { label: "READY", cls: "border-good text-good" },
  generating: { label: "ON AIR", cls: "border-air text-air", dot: true },
  failed: { label: "FAILED", cls: "border-air text-air" },
  pending: { label: "PENDING", cls: "border-line text-muted" },
};

// Resting waveform for the empty state: still, symmetrical, taller in the middle.
const RESTING = [22, 34, 46, 60, 74, 88, 100, 88, 74, 60, 46, 34, 22];

function chipFor(status: string): StatusChip {
  return STATUS[status] ?? { label: status.toUpperCase(), cls: "border-line text-muted" };
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
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="font-mono text-sm text-faint">03</span>
        <h2 className="wordmark text-2xl leading-none text-ink">Past episodes</h2>
        <span className="ml-auto font-mono text-[11px] uppercase tracking-wider text-faint">
          Rundown | Archive
        </span>
      </div>

      {!loading && episodes.length === 0 && (
        <div className="rounded-2xl border border-line bg-bg2 py-14 text-center">
          <div className="mx-auto mb-6 flex h-14 items-end justify-center gap-1" aria-hidden="true">
            {RESTING.map((h, i) => (
              <span key={i} className="w-1 rounded-full bg-amber" style={{ height: `${h}%` }} />
            ))}
          </div>
          <h3 className="wordmark text-3xl text-ink">Nothing on the wire yet</h3>
          <p className="mt-2 text-sm text-muted">Pick your interests and make the first one.</p>
        </div>
      )}

      {episodes.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-bg2">
          {episodes.map((ep, i) => {
            const title = ep.title || `Episode ${ep.id}`;
            const open = expandedId === ep.id;
            const chip = chipFor(ep.status);
            return (
              <li key={ep.id}>
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
                  <span className="w-6 flex-shrink-0 font-mono text-xs text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="wordmark block truncate text-lg leading-none text-ink">
                      {title}
                    </span>
                    <span className="mt-1 block font-mono text-[11px] text-faint">
                      {metaLine(ep)}
                    </span>
                  </span>
                  <span
                    className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${chip.cls}`}
                  >
                    {chip.dot && (
                      <span className="h-1.5 w-1.5 rounded-full bg-air" aria-hidden="true" />
                    )}
                    {chip.label}
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
                        date={ep.created_at}
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
