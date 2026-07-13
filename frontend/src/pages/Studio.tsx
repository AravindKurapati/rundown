import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { EpisodeSummary, Preferences } from "../types";
import PreferencesForm from "../components/PreferencesForm";
import EpisodeLibrary from "../components/EpisodeLibrary";
import EpisodeCover from "../components/EpisodeCover";
import heroImg from "../assets/hero.jpg";

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
  "No episodes yet. Pick your interests below and press the button; the first one is the hardest, and it's one click.";

// Cycle topic chips through the multi-accent system so the palette reads
// colorful, not monochrome.
const CHIP_STYLES = [
  "bg-coral text-white",
  "bg-violet text-white",
  "bg-teal text-[#08140f]",
  "bg-gold text-[#1a1206]",
  "bg-rose text-white",
];

type StatusTone = "ready" | "busy" | "error";
interface StatusMessage {
  tone: StatusTone;
  text: string;
}

function statusToneClass(tone: StatusTone): string {
  if (tone === "ready") return "text-good";
  if (tone === "busy") return "text-amber";
  return "text-air";
}

function parseTopics(json: string | undefined): string[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed.map(String).slice(0, 5);
  } catch {
    // ignore
  }
  return [];
}

export default function Studio() {
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [autoExpandId, setAutoExpandId] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const libraryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      const list = (await api.listEpisodes()) as EpisodeSummary[];
      setEpisodes(list);
    })();
  }, [refreshToken]);

  useEffect(() => {
    void (async () => {
      const prefs = (await api.getPreferences()) as Preferences;
      setTopics(parseTopics(prefs.interests_json));
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

  function openEpisode(id: number) {
    setAutoExpandId(id);
    libraryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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

  const hasEpisodes = episodes.length > 0;
  const readyEpisodes = episodes.filter((e) => e.status === "ready");

  return (
    <div className="pb-16">
      {/* ---- full-bleed photo hero ---- */}
      <section className="rise hero-photo relative mx-3 mt-4 overflow-hidden rounded-3xl sm:mx-6">
        <img
          src={heroImg}
          alt="A listener with headphones looking out over the water toward the city"
          className="absolute inset-0 h-full w-full object-cover object-[center_42%]"
        />
        <div className="hero-scrim absolute inset-0" />
        <div className="absolute inset-0 z-10 mx-auto flex max-w-5xl flex-col justify-end p-6 sm:p-10">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-coral">
            <span className="live-dot" aria-hidden="true" />
            On air · today's briefing
          </p>

          <h1 className="wordmark text-[clamp(60px,10vw,150px)] leading-[0.82] text-[#f5ede1]">
            RUNDOWN
          </h1>
          <p className="mt-4 max-w-lg text-lg text-[#efe4d4]/90 sm:text-xl">
            Your day, in five minutes. The stories you care about, read aloud.
          </p>

          {topics.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2.5">
              {topics.map((t, i) => (
                <span
                  key={t}
                  className={`rounded-full px-4 py-1.5 text-sm font-bold ${CHIP_STYLES[i % CHIP_STYLES.length]}`}
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => void onGenerate()}
              disabled={busy}
              className="inline-flex items-center gap-2.5 rounded-full bg-[#f5ede1] px-7 py-4 text-sm font-extrabold uppercase tracking-wide text-[#161009] transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              <span aria-hidden="true">{busy ? "●" : "▸"}</span>
              {busy ? "On air…" : "Make today's episode"}
            </button>

            {busy && (
              <span className="font-mono text-sm text-[#efe4d4]/80">
                {STAGE_PHRASES[stageIndex]}…
              </span>
            )}
            {!busy && statusMessage && (
              <span className={`text-sm font-semibold ${statusToneClass(statusMessage.tone)}`}>
                {statusMessage.text}
              </span>
            )}
          </div>

          {!busy && !statusMessage && !hasEpisodes && (
            <p className="mt-5 max-w-md text-sm text-[#efe4d4]/80">{EMPTY_STATE}</p>
          )}
        </div>
      </section>

      {/* ---- everything below sits on the normal page ground ---- */}
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        {/* ---- recent covers band ---- */}
      {readyEpisodes.length > 0 && (
        <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {readyEpisodes.slice(0, 4).map((ep) => (
            <button
              key={ep.id}
              type="button"
              onClick={() => openEpisode(ep.id)}
              className="group text-left"
            >
              <EpisodeCover
                seed={ep.id}
                live={ep.status === "generating"}
                className="aspect-square w-full rounded-2xl transition-transform group-hover:-translate-y-1"
              />
              <p className="mt-2 truncate text-sm font-semibold text-ink">
                {ep.title || `Episode ${ep.id}`}
              </p>
            </button>
          ))}
        </section>
      )}

      {/* ---- studio settings ---- */}
      <section className="mt-14">
        <div className="mb-4 flex items-center gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
            On the air today
          </p>
          <span className="h-px flex-1 bg-line" />
        </div>
        <PreferencesForm onSaved={() => setRefreshToken((t) => t + 1)} />
      </section>

      <section ref={libraryRef} className="mt-12 scroll-mt-24">
        <EpisodeLibrary refreshToken={refreshToken} autoExpandId={autoExpandId} />
      </section>
      </div>
    </div>
  );
}
