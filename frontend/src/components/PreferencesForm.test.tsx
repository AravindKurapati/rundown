import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PreferencesForm from "./PreferencesForm";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: {
    getPreferences: vi.fn(),
    getSchedule: vi.fn(),
    listVoices: vi.fn(),
    putPreferences: vi.fn(),
  },
}));

const prefs = {
  id: 1,
  interests_json: '["AI"]',
  tone: "Sharp & brisk",
  target_minutes: 5,
  host_mode: "single",
  voice_a: "onwK4e9ZLuTAKqWW03F9",
  voice_b: "ErXwobaYiN019PkySvjV",
  tts_model: "eleven_multilingual_v2",
  llm_model_script: "gpt-5.5",
  schedule_cadence: "daily",
  schedule_time: "07:00",
  timezone: "America/New_York",
};

function mockLoads() {
  vi.mocked(api.getPreferences).mockResolvedValue(prefs);
  vi.mocked(api.getSchedule).mockResolvedValue({
    cadence: "daily",
    time: "07:00",
    timezone: "America/New_York",
    next_run: "2026-07-16T07:00:00-04:00",
  });
  vi.mocked(api.listVoices).mockResolvedValue({
    voices: [{ id: prefs.voice_a, name: "Daniel", description: "British news presenter" }],
  });
}

describe("PreferencesForm save failure", () => {
  it("surfaces a rejected save instead of failing silently", async () => {
    mockLoads();
    vi.mocked(api.putPreferences).mockRejectedValue(
      new Error("Unknown timezone: America/Gotham")
    );

    render(<PreferencesForm />);
    const save = await screen.findByRole("button", { name: /save settings/i });
    fireEvent.click(save);

    // The user must see that the save failed, with the server's reason.
    await waitFor(() =>
      expect(screen.getByText(/Unknown timezone: America\/Gotham/)).toBeInTheDocument()
    );
    // And the form must not claim success.
    expect(screen.queryByText("Saved.")).not.toBeInTheDocument();
  });
});
