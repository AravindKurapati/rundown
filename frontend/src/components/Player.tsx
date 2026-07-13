import { useState } from "react";
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

export default function Player({
  episodeId,
  title,
  transcriptJson,
  durationSeconds,
}: PlayerProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const segments = parseTranscript(transcriptJson);

  return (
    <div className="space-y-3">
      <AudioPlayer
        src={api.audioUrl(episodeId)}
        title={title}
        seed={episodeId}
        durationHint={durationSeconds}
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
            <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-line bg-bg3 p-3 text-sm text-muted">
              {segments.map((segment, i) => (
                <p key={i}>
                  <span className="font-mono text-xs font-medium uppercase tracking-wide text-faint">
                    {segment.speaker}:{" "}
                  </span>
                  {segment.text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
