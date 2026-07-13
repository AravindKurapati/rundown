import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import EpisodeLibrary from "./EpisodeLibrary";

// The library renders whatever the API returns; stub it so we can assert the
// status chip mapping (the one bit of real display logic in this component)
// without a backend.
vi.mock("../api/client", () => ({
  api: {
    listEpisodes: vi.fn().mockResolvedValue([
      { id: 1, title: "Ready one", status: "ready", created_at: "2026-07-13T09:00:00Z", duration_seconds: 300 },
      { id: 2, title: "Cooking", status: "generating", created_at: "2026-07-13T09:05:00Z", duration_seconds: null },
      { id: 3, title: "Broke", status: "failed", created_at: "2026-07-13T09:10:00Z", duration_seconds: null },
    ]),
    getEpisode: vi.fn(),
  },
}));

describe("EpisodeLibrary", () => {
  it("renders the right status chip for each episode state", async () => {
    render(<EpisodeLibrary refreshToken={0} />);
    // ready -> READY, generating -> ON AIR, failed -> FAILED
    expect(await screen.findByText("READY")).toBeInTheDocument();
    expect(screen.getByText("ON AIR")).toBeInTheDocument();
    expect(screen.getByText("FAILED")).toBeInTheDocument();
  });
});
