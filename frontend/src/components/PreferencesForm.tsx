import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Preferences } from "../types";

// GET /schedule returns this shape (derived from the same preferences row, plus
// a computed next_run). Not in types.ts since it is not part of the Preferences
// entity itself.
interface ScheduleInfo {
  cadence: string;
  time: string;
  timezone: string;
  next_run: string;
}

function interestsToText(json: string): string {
  try {
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed.join(", ");
  } catch {
    // fall through
  }
  return "";
}

function textToInterestsJson(text: string): string {
  const list = text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return JSON.stringify(list);
}

const inputClass = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";
const labelClass = "mb-1 block text-sm font-medium text-gray-900";

export default function PreferencesForm() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [interestsText, setInterestsText] = useState("");
  const [schedule, setSchedule] = useState<ScheduleInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const loaded = (await api.getPreferences()) as Preferences;
    setPrefs(loaded);
    setInterestsText(interestsToText(loaded.interests_json));
    const sched = (await api.getSchedule()) as ScheduleInfo;
    setSchedule(sched);
  }

  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPrefs((current) => (current ? { ...current, [key]: value } : current));
    setSaved(false);
  }

  async function onSave() {
    if (!prefs) return;
    setSaving(true);
    try {
      const body: Preferences = { ...prefs, interests_json: textToInterestsJson(interestsText) };
      await api.putPreferences(body);
      const sched = (await api.getSchedule()) as ScheduleInfo;
      setSchedule(sched);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!prefs) {
    return <p className="px-6 py-8 text-sm text-gray-500">Loading preferences...</p>;
  }

  return (
    <section className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
      <div>
        <label htmlFor="interests" className={labelClass}>
          What you care about
        </label>
        <input
          id="interests"
          type="text"
          value={interestsText}
          onChange={(e) => {
            setInterestsText(e.target.value);
            setSaved(false);
          }}
          placeholder="AI, startups, markets"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="tone" className={labelClass}>
            How it should sound
          </label>
          <input
            id="tone"
            type="text"
            value={prefs.tone}
            onChange={(e) => update("tone", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="target_minutes" className={labelClass}>
            How long
          </label>
          <input
            id="target_minutes"
            type="number"
            min={1}
            value={prefs.target_minutes}
            onChange={(e) => update("target_minutes", Number(e.target.value))}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="voice_a" className={labelClass}>
            The voice
          </label>
          <input
            id="voice_a"
            type="text"
            value={prefs.voice_a}
            onChange={(e) => update("voice_a", e.target.value)}
            placeholder="Primary voice"
            className={inputClass}
          />
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
          <p className="mt-2 text-xs text-gray-500">
            Next run: {new Date(schedule.next_run).toLocaleString()}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="rounded-md border border-gray-900 px-4 py-2 text-sm font-medium text-gray-900 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && <span className="text-sm text-green-700">Saved.</span>}
      </div>
    </section>
  );
}
