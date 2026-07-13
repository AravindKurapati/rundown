import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AudioPlayer from "./AudioPlayer";

describe("AudioPlayer", () => {
  it("cycles playback speed through the rate ladder and wraps", () => {
    render(<AudioPlayer src="/x.mp3" title="Test episode" seed={1} durationHint={300} date={null} />);
    const speed = screen.getByRole("button", { name: /playback speed/i });

    expect(speed).toHaveTextContent("1×");
    fireEvent.click(speed);
    expect(speed).toHaveTextContent("1.25×");
    fireEvent.click(speed);
    expect(speed).toHaveTextContent("1.5×");
    fireEvent.click(speed); // -> 2×
    fireEvent.click(speed); // wraps back to 1×
    expect(speed).toHaveTextContent("1×");
  });
});
