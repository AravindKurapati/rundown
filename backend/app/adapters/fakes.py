import json
from app.adapters.base import LLMResult, SegmentAudio
from app.config import settings

# Minimal valid silent MP3 frame (enough bytes for a real file on disk).
_SILENT_MP3 = b"ID3\x03\x00\x00\x00\x00\x00\x00" + b"\xff\xfb\x90\x64" + b"\x00" * 512

# Each fake segment renders as 300ms of non-silent PCM so assembly, duration
# math, and encoding are all exercised offline with real byte counts.
_SEGMENT_MS = 300


class FakeLLMClient:
    def complete(self, system: str, user: str, model: str) -> LLMResult:
        segments = [
            {"kind": "intro", "speaker": "host", "text": "Here is your rundown for today.", "energy": "warm"},
            {"kind": "story", "speaker": "host", "text": "A notable development happened in tech.", "energy": "high"},
            {"kind": "story", "speaker": "host", "text": "A quieter story rounds things out.", "energy": "calm"},
            {"kind": "outro", "speaker": "host", "text": "That is the rundown. Back tomorrow.", "energy": "warm"},
        ]
        # Mirror the real provider: json_object mode returns a top-level object.
        text = json.dumps({"segments": segments})
        return LLMResult(text=text, tokens_in=len(user.split()), tokens_out=len(text.split()))


class FakeTTSClient:
    def __init__(self, fail_after: int | None = None) -> None:
        self.calls: list[dict] = []
        self._fail_after = fail_after
        self._segment_calls = 0

    def synthesize(self, text: str, voice_id: str, model_id: str) -> bytes:
        self.calls.append({"chars": len(text), "voice_id": voice_id, "model_id": model_id})
        return _SILENT_MP3

    def synthesize_segment(
        self,
        text: str,
        voice_id: str,
        model_id: str,
        energy: str = "warm",
        previous_request_ids: list[str] | None = None,
    ) -> SegmentAudio:
        self._segment_calls += 1
        if self._fail_after is not None and self._segment_calls > self._fail_after:
            raise RuntimeError("fake TTS failure")
        self.calls.append({
            "chars": len(text), "voice_id": voice_id, "model_id": model_id,
            "energy": energy, "previous_request_ids": list(previous_request_ids or []),
        })
        pcm = b"\x01\x00" * (settings.pcm_rate * _SEGMENT_MS // 1000)
        return SegmentAudio(pcm=pcm, request_id=f"fake-{self._segment_calls}", billed_chars=len(text))
