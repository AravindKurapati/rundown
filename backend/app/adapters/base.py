from dataclasses import dataclass
from typing import Protocol


@dataclass
class LLMResult:
    text: str
    tokens_in: int
    tokens_out: int


class LLMClient(Protocol):
    def complete(self, system: str, user: str, model: str) -> LLMResult: ...


class TTSClient(Protocol):
    def synthesize(self, text: str, voice_id: str, model_id: str) -> bytes: ...
