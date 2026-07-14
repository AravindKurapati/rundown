import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { EpisodeSummary, Estimate, Preferences } from "../types";
import PreferencesForm from "../components/PreferencesForm";
import EpisodeLibrary from "../components/EpisodeLibrary";
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
const SAVED_MESSAGE = "Settings saved. Make today's episode when you're ready.";
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

// A still, decorative waveform for the archive's summary end-cap.
const WIRE_BARS = [28, 52, 38, 68, 46, 82, 54, 90, 60, 82, 46, 68, 38, 52, 28];

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
  const [confirming, setConfirming] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const libraryRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

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

  async function openConfirm() {
    setStatusMessage(null);
    try {
      const e = (await api.estimate()) as Estimate;
      setEstimate(e);
      setConfirming(true);
    } catch {
      // If the estimate can't be fetched, don't block the user — generate.
      void onGenerate();
    }
  }

  async function onGenerate() {
    setConfirming(false);
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
  const minutesOnAir = Math.round(
    readyEpisodes.reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / 60
  );

  return (
    <div className="pb-16">
      {/* ---- full-bleed photo hero ---- */}
      <section
        ref={heroRef}
        className="rise hero-photo relative mx-3 mt-4 overflow-hidden rounded-3xl sm:mx-6 scroll-mt-20"
      >
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
            Your daily briefing, in minutes not hours. The stories you care about, read aloud.
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

          <div className="mt-7">
            {confirming && estimate ? (
              <div className="max-w-sm rounded-2xl border border-white/15 bg-[#161009]/90 p-5 backdrop-blur">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral">
                  Ready to record
                </p>
                <p className="mt-2 text-lg font-semibold text-[#f5ede1]">
                  ~{estimate.minutes} min · {estimate.voice_name}
                </p>
                {estimate.topics.length > 0 && (
                  <p className="mt-1 text-sm text-[#efe4d4]/80">{estimate.topics.join(" · ")}</p>
                )}
                <p className="mt-3 font-mono text-sm text-[#f5ede1]">
                  {estimate.offline
                    ? "Free · offline mode"
                    : `Est. cost ~$${estimate.est_cost_usd.toFixed(2)}`}
                </p>
                {estimate.would_exceed_budget && (
                  <p className="mt-2 text-sm font-semibold text-air">
                    This would cross your ${estimate.budget_cap_usd.toFixed(0)} budget cap.
                  </p>
                )}
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    disabled={estimate.would_exceed_budget}
                    onClick={() => void onGenerate()}
                    className="rounded-full bg-[#f5ede1] px-5 py-2.5 text-sm font-extrabold uppercase tracking-wide text-[#161009] transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                  >
                    Make it
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-[#efe4d4] transition-colors hover:border-white/50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => void openConfirm()}
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
            )}
          </div>

          {!busy && !confirming && !statusMessage && !hasEpisodes && (
            <p className="mt-5 max-w-md text-sm text-[#efe4d4]/80">{EMPTY_STATE}</p>
          )}
        </div>
      </section>

      {/* ---- console: settings on the left, the archive on the right, so the
             width is actually used instead of a lonely centered column ---- */}
      <div className="mx-auto mt-12 grid max-w-6xl gap-8 px-5 sm:px-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* ---- studio settings (sticky: it's the control panel, so it follows
               you while you scroll the archive instead of leaving the left blank) ---- */}
        <section className="xl:sticky xl:top-20">
          <div className="mb-4 flex items-center gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
              On the air today
            </p>
            <span className="h-px flex-1 bg-line" />
          </div>
          <PreferencesForm
            onSaved={() => {
              setRefreshToken((t) => t + 1);
              setStatusMessage({ tone: "ready", text: SAVED_MESSAGE });
              heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        </section>

        <section ref={libraryRef} className="flex scroll-mt-24 flex-col">
          <EpisodeLibrary refreshToken={refreshToken} autoExpandId={autoExpandId} />

          {/* Summary end-cap: grows to fill the archive column so a short list
              doesn't strand the right side, and it carries real numbers. */}
          {readyEpisodes.length > 0 && (
            <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-2xl border border-line bg-bg2 p-8 text-center">
              <div className="mb-6 flex h-10 items-end gap-1" aria-hidden="true">
                {WIRE_BARS.map((h, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-amber"
                    style={{ height: `${h}%`, opacity: 0.55 }}
                  />
                ))}
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
                The wire, so far
              </p>
              <div className="mt-4 flex items-end gap-12">
                <div>
                  <p className="font-mono text-4xl tabular-nums text-ink">{readyEpisodes.length}</p>
                  <p className="mt-1 text-xs text-muted">episodes</p>
                </div>
                <div>
                  <p className="font-mono text-4xl tabular-nums text-ink">{minutesOnAir}</p>
                  <p className="mt-1 text-xs text-muted">minutes on air</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
