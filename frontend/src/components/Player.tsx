import { useState } from "react";
import { api } from "../api/client";

interface TranscriptSegment {
  kind: string;
  speaker: string;
  text: string;
}

interface PlayerProps {
  episodeId: number;
  transcriptJson: string | null;
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

export default function Player({ episodeId, transcriptJson }: PlayerProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const segments = parseTranscript(transcriptJson);

  return (
    <div className="space-y-3">
      <audio controls src={api.audioUrl(episodeId)} className="w-full">
        Your browser does not support the audio element.
      </audio>

      {segments.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </button>

          {showTranscript && (
            <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-md bg-gray-50 p-3 text-sm text-gray-700">
              {segments.map((segment, i) => (
                <p key={i}>
                  <span className="font-medium text-gray-500">{segment.speaker}: </span>
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
