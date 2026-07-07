import { useEffect, useState } from "react";
import { api } from "../api/client";
import PreferencesForm from "../components/PreferencesForm";
import EpisodeLibrary from "../components/EpisodeLibrary";

const STAGE_PHRASES = [
  "Rounding up today's news",
  "Cutting the duplicate stories",
  "Writing your briefing",
  "Reading it aloud",
];

const BUSY_REFUSAL = "One at a time: an episode is already in the works.";
const GENERATION_ERROR =
  "That episode didn't make it. Your settings are safe, so give it another try in a moment.";
const READY_MESSAGE = "Today's episode is ready. Headphones on.";
const EMPTY_STATE =
  "No episodes yet. Pick your interests above and press the button; the first one is the hardest, and it's one click.";

type StatusTone = "ready" | "busy" | "error";
interface StatusMessage {
  tone: StatusTone;
  text: string;
}

function statusToneClass(tone: StatusTone): string {
  if (tone === "ready") return "text-green-700";
  if (tone === "busy") return "text-amber-700";
  return "text-red-700";
}

export default function Studio() {
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [autoExpandId, setAutoExpandId] = useState<number | null>(null);
  const [hasEpisodes, setHasEpisodes] = useState(true);

  useEffect(() => {
    void (async () => {
      const list = (await api.listEpisodes()) as unknown[];
      setHasEpisodes(list.length > 0);
    })();
  }, [refreshToken]);

  // Cosmetic only: the backend exposes an episode's status ("generating" /
  // "ready" / "failed") during polling, not a live pipeline stage. These
  // phrases are not tied to real progress; they just cycle on a timer so the
  // waiting screen feels alive instead of frozen on one line.
  useEffect(() => {
    if (!busy) {
      setStageIndex(0);
      return;
    }
    const id = setInterval(() => {
      setStageIndex((i) => (i + 1) % STAGE_PHRASES.length);
    }, 2200);
    return () => clearInterval(id);
  }, [busy]);

  async function onGenerate() {
    setBusy(true);
    setStatusMessage(null);
    try {
      const created = (await api.generate()) as { episode_id: number };
      let ep = (await api.getEpisode(created.episode_id)) as { status: string };
      while (ep.status === "generating") {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        ep = (await api.getEpisode(created.episode_id)) as { status: string };
      }
      if (ep.status === "failed") {
        setStatusMessage({ tone: "error", text: GENERATION_ERROR });
      } else {
        setStatusMessage({ tone: "ready", text: READY_MESSAGE });
        setAutoExpandId(created.episode_id);
      }
      setRefreshToken((t) => t + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "409") {
        setStatusMessage({ tone: "busy", text: BUSY_REFUSAL });
      } else {
        setStatusMessage({ tone: "error", text: GENERATION_ERROR });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-8">
      <PreferencesForm />

      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <button
          type="button"
          onClick={() => void onGenerate()}
          disabled={busy}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Making your episode" : "Make today's episode"}
        </button>

        {busy && (
          <ul className="space-y-1 text-sm text-gray-500">
            {STAGE_PHRASES.map((phrase, i) => (
              <li key={phrase} className={i === stageIndex ? "font-medium text-gray-800" : ""}>
                {phrase}
              </li>
            ))}
          </ul>
        )}

        {!busy && statusMessage && (
          <p className={`text-sm ${statusToneClass(statusMessage.tone)}`}>{statusMessage.text}</p>
        )}

        {!busy && !statusMessage && !hasEpisodes && (
          <p className="text-sm text-gray-500">{EMPTY_STATE}</p>
        )}
      </section>

      <EpisodeLibrary refreshToken={refreshToken} autoExpandId={autoExpandId} />
    </div>
  );
}
