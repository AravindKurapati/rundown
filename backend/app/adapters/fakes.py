import json
from app.adapters.base import LLMResult

# Minimal valid silent MP3 frame (enough bytes for a real file on disk).
_SILENT_MP3 = b"ID3\x03\x00\x00\x00\x00\x00\x00" + b"\xff\xfb\x90\x64" + b"\x00" * 512


class FakeLLMClient:
    def complete(self, system: str, user: str, model: str) -> LLMResult:
        segments = [
            {"kind": "intro", "speaker": "host", "text": "Here is your rundown for today."},
            {"kind": "story", "speaker": "host", "text": "A notable development happened in tech."},
            {"kind": "outro", "speaker": "host", "text": "That is the rundown. Back tomorrow."},
        ]
        text = json.dumps(segments)
        return LLMResult(text=text, tokens_in=len(user.split()), tokens_out=len(text.split()))


class FakeTTSClient:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    def synthesize(self, text: str, voice_id: str, model_id: str) -> bytes:
        self.calls.append({"chars": len(text), "voice_id": voice_id, "model_id": model_id})
        return _SILENT_MP3
