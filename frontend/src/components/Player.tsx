import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import AudioPlayer from "./AudioPlayer";

interface TranscriptSegment {
  kind: string;
  speaker: string;
  text: string;
}

interface PlayerProps {
  episodeId: number;
  title: string;
  transcriptJson: string | null;
  durationSeconds?: number | null;
  date?: string | null;
}

function parseTranscript(raw: string | null): TranscriptSegment[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as TranscriptSegment[];
  } catch {
    return [];
  }
}

// The script spells acronyms as spaced letters ("A I", "F C C") so ElevenLabs
// pronounces them as letters. That's right for the ear, wrong for the eye, so
// collapse those letter-runs back for the on-screen transcript.
function humanize(text: string): string {
  return text.replace(/\b([A-Z])(?:\s[A-Z]\b)+/g, (m) => m.replace(/\s+/g, ""));
}

export default function Player({
  episodeId,
  title,
  transcriptJson,
  durationSeconds,
  date,
}: PlayerProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [progress, setProgress] = useState({ cur: 0, dur: 0 });
  const activeRef = useRef<HTMLParagraphElement>(null);
  const segments = parseTranscript(transcriptJson);

  // Approximate which segment is being read: map the elapsed fraction onto
  // cumulative character length. Not per-word timing, but it follows the read
  // closely enough to highlight along, using only data we already have.
  const totalChars = segments.reduce((sum, s) => sum + s.text.length, 0) || 1;
  const dur = progress.dur || durationSeconds || 0;
  const playedChars = dur > 0 ? (progress.cur / dur) * totalChars : 0;
  let acc = 0;
  let activeIdx = -1;
  for (let i = 0; i < segments.length; i++) {
    acc += segments[i].text.length;
    if (playedChars > 0 && playedChars <= acc) {
      activeIdx = i;
      break;
    }
  }

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeIdx]);

  return (
    <div className="space-y-3">
      <AudioPlayer
        src={api.audioUrl(episodeId)}
        title={title}
        seed={episodeId}
        durationHint={durationSeconds}
        date={date}
        onProgress={(cur, d) => setProgress({ cur, dur: d })}
      />

      {segments.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </button>

          {showTranscript && (
            <div className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-xl border border-line bg-bg2 p-3">
              {segments.map((segment, i) => {
                const active = i === activeIdx;
                return (
                  <p
                    key={i}
                    ref={active ? activeRef : undefined}
                    className={`rounded-lg px-3 py-2 text-[15px] leading-relaxed transition-colors ${
                      active ? "bg-bg3 text-ink" : "text-muted"
                    }`}
                  >
                    <span className="mr-2 align-[0.15em] font-mono text-[10px] uppercase tracking-wider text-faint">
                      {segment.kind}
                    </span>
                    {humanize(segment.text)}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
