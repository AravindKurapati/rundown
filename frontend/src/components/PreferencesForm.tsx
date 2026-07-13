import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Preferences, Voice } from "../types";

// GET /schedule returns this shape (derived from the same preferences row, plus
// a computed next_run). Not in types.ts since it is not part of the Preferences
// entity itself.
interface ScheduleInfo {
  cadence: string;
  time: string;
  timezone: string;
  next_run: string;
}

type DurationUnit = "minutes" | "hours";

const PRESET_TOPICS = [
  "AI",
  "Startups",
  "Markets",
  "Tech",
  "Politics",
  "Science",
  "Sports",
  "Business",
  "World",
  "Culture",
  "Health",
];

// Selected topic chips cycle these accents so the row reads colorful.
const TOPIC_ACCENTS = [
  "bg-coral text-white",
  "bg-violet text-white",
  "bg-teal text-[#08140f]",
  "bg-gold text-[#1a1206]",
  "bg-rose text-white",
];

const TONE_PRESETS = [
  "Sharp & brisk",
  "Calm & measured",
  "Warm & friendly",
  "Witty & light",
  "Serious & factual",
];

const inputClass =
  "w-full rounded-lg border border-line bg-bg text-ink px-3 py-2 text-sm placeholder:text-faint focus:border-amber focus:outline-none";
const labelClass =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-faint";

function parseTopics(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // fall through
  }
  return [];
}

interface PreferencesFormProps {
  onSaved?: () => void;
}

export default function PreferencesForm({ onSaved }: PreferencesFormProps) {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [schedule, setSchedule] = useState<ScheduleInfo | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [customVoice, setCustomVoice] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState("");
  const [customTone, setCustomTone] = useState(false);
  const [durValue, setDurValue] = useState(5);
  const [durUnit, setDurUnit] = useState<DurationUnit>("minutes");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const loaded = (await api.getPreferences()) as Preferences;
    setPrefs(loaded);
    setTopics(parseTopics(loaded.interests_json));
    // A non-preset tone shows as a "Current tone" option in the dropdown (like
    // the voice picker), rather than forcing the free-text field open.
    if (loaded.target_minutes >= 60 && loaded.target_minutes % 60 === 0) {
      setDurUnit("hours");
      setDurValue(loaded.target_minutes / 60);
    } else {
      setDurUnit("minutes");
      setDurValue(loaded.target_minutes);
    }
    const sched = (await api.getSchedule()) as ScheduleInfo;
    setSchedule(sched);
    const vs = (await api.listVoices()) as { voices: Voice[] };
    setVoices(vs.voices);
    // A saved voice that isn't in the list is a custom/cloned ID — show the text
    // field so it stays editable and visible rather than silently mismatched.
    if (loaded.voice_a && !vs.voices.some((v) => v.id === loaded.voice_a)) {
      setCustomVoice(true);
    }
  }

  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPrefs((current) => (current ? { ...current, [key]: value } : current));
    setSaved(false);
  }

  const topicOn = (t: string) => topics.some((x) => x.toLowerCase() === t.toLowerCase());

  function toggleTopic(t: string) {
    setTopics((cur) =>
      topicOn(t) ? cur.filter((x) => x.toLowerCase() !== t.toLowerCase()) : [...cur, t]
    );
    setSaved(false);
  }

  function addCustomTopic() {
    const t = customTopic.trim();
    if (t && !topicOn(t)) {
      setTopics((cur) => [...cur, t]);
      setSaved(false);
    }
    setCustomTopic("");
  }

  function removeTopic(t: string) {
    setTopics((cur) => cur.filter((x) => x !== t));
    setSaved(false);
  }

  function setDuration(value: number, unit: DurationUnit) {
    setDurValue(value);
    setDurUnit(unit);
    update("target_minutes", unit === "hours" ? Math.round(value * 60) : Math.round(value));
  }

  async function onSave() {
    if (!prefs) return;
    setSaving(true);
    try {
      const body: Preferences = { ...prefs, interests_json: JSON.stringify(topics) };
      await api.putPreferences(body);
      const sched = (await api.getSchedule()) as ScheduleInfo;
      setSchedule(sched);
      setSaved(true);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  if (!prefs) {
    return <p className="px-6 py-8 text-sm text-muted">Loading preferences…</p>;
  }

  const customTopics = topics.filter(
    (t) => !PRESET_TOPICS.some((p) => p.toLowerCase() === t.toLowerCase())
  );

  return (
    <section className="space-y-6 rounded-2xl border border-line bg-bg2 p-6">
      {/* what you care about — chips + add your own */}
      <div>
        <label className={labelClass}>What you care about</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_TOPICS.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTopic(t)}
              aria-pressed={topicOn(t)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                topicOn(t)
                  ? TOPIC_ACCENTS[i % TOPIC_ACCENTS.length]
                  : "border border-line bg-bg3 text-muted hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
          {customTopics.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => removeTopic(t)}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber bg-bg3 px-3.5 py-1.5 text-sm font-semibold text-ink"
            >
              {t}
              <span aria-hidden="true" className="text-faint">
                ✕
              </span>
            </button>
          ))}
        </div>
        <div className="mt-2.5 flex gap-2">
          <input
            type="text"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomTopic();
              }
            }}
            placeholder="Add your own topic"
            className={`${inputClass} max-w-[220px]`}
          />
          <button
            type="button"
            onClick={addCustomTopic}
            className="rounded-lg border border-line px-3 text-sm font-semibold text-muted transition-colors hover:border-amber hover:text-ink"
          >
            Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* how it should sound — preset dropdown + custom */}
        <div>
          <label htmlFor="tone" className={labelClass}>
            How it should sound
          </label>
          {customTone ? (
            <input
              id="tone"
              type="text"
              value={prefs.tone}
              onChange={(e) => update("tone", e.target.value)}
              placeholder="Describe the tone"
              className={inputClass}
            />
          ) : (
            <select
              id="tone"
              value={prefs.tone}
              onChange={(e) => update("tone", e.target.value)}
              className={inputClass}
            >
              {prefs.tone && !TONE_PRESETS.includes(prefs.tone) && (
                <option value={prefs.tone}>Current tone</option>
              )}
              {TONE_PRESETS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setCustomTone((c) => !c)}
            className="mt-1.5 text-xs font-medium text-muted hover:text-ink"
          >
            {customTone ? "Choose a preset" : "Describe a custom tone"}
          </button>
        </div>

        {/* how long — number + unit */}
        <div>
          <label htmlFor="target_minutes" className={labelClass}>
            How long
          </label>
          <div className="flex gap-2">
            <input
              id="target_minutes"
              type="number"
              min={1}
              value={durValue}
              onChange={(e) => setDuration(Number(e.target.value), durUnit)}
              className={`${inputClass} w-24`}
            />
            <select
              value={durUnit}
              onChange={(e) => setDuration(durValue, e.target.value as DurationUnit)}
              className={`${inputClass} w-32`}
              aria-label="Length unit"
            >
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
            </select>
          </div>
        </div>

        {/* the voice — named dropdown + custom id */}
        <div>
          <label htmlFor="voice_a" className={labelClass}>
            The voice
          </label>
          {customVoice ? (
            <input
              id="voice_a"
              type="text"
              value={prefs.voice_a}
              onChange={(e) => update("voice_a", e.target.value)}
              placeholder="ElevenLabs voice ID"
              className={inputClass}
            />
          ) : (
            <select
              id="voice_a"
              value={prefs.voice_a}
              onChange={(e) => update("voice_a", e.target.value)}
              className={inputClass}
            >
              {prefs.voice_a && !voices.some((v) => v.id === prefs.voice_a) && (
                <option value={prefs.voice_a}>Current voice</option>
              )}
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.description}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setCustomVoice((c) => !c)}
            className="mt-1.5 text-xs font-medium text-muted hover:text-ink"
          >
            {customVoice ? "Choose from the list" : "Paste a custom voice ID"}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="schedule_cadence" className={labelClass}>
          When it arrives
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            id="schedule_cadence"
            value={prefs.schedule_cadence}
            onChange={(e) => update("schedule_cadence", e.target.value)}
            className={inputClass}
          >
            <option value="daily">Daily</option>
            <option value="weekdays">Weekdays</option>
            <option value="weekly">Weekly</option>
          </select>
          <input
            type="time"
            value={prefs.schedule_time}
            onChange={(e) => update("schedule_time", e.target.value)}
            className={inputClass}
          />
          <input
            type="text"
            value={prefs.timezone}
            onChange={(e) => update("timezone", e.target.value)}
            className={inputClass}
          />
        </div>
        {schedule && (
          <p className="mt-2 font-mono text-xs text-faint">
            Next run: {new Date(schedule.next_run).toLocaleString()}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-amber hover:text-amber disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-sm font-semibold text-good">Saved.</span>}
      </div>
    </section>
  );
}
