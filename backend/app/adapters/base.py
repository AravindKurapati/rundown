from dataclasses import dataclass
from typing import Protocol


@dataclass
class LLMResult:
    text: str
    tokens_in: int
    tokens_out: int


class LLMClient(Protocol):
    def complete(self, system: str, user: str, model: str) -> LLMResult: ...


@dataclass
class SegmentAudio:
    pcm: bytes
    billed_chars: int


class TTSClient(Protocol):
    def synthesize(self, text: str, voice_id: str, model_id: str) -> bytes: ...

    def synthesize_segment(
        self,
        text: str,
        voice_id: str,
        model_id: str,
        energy: str = "warm",
        previous_text: str | None = None,
        next_text: str | None = None,
    ) -> SegmentAudio: ...
