import "@testing-library/jest-dom/vitest";

// jsdom does not implement HTMLMediaElement playback. Stub the methods so
// components that touch the <audio> element in effects or handlers don't throw
// during tests (the transport controls call play/pause).
window.HTMLMediaElement.prototype.play = async () => {};
window.HTMLMediaElement.prototype.pause = () => {};
