from dataclasses import dataclass
from app.adapters.base import TTSClient
from app.pipeline.scriptwriter import Segment


@dataclass
class NarrateResult:
    audio: bytes
    characters: int
    word_count: int


def narrate_single(tts: TTSClient, segments: list[Segment], voice_id: str, model_id: str) -> NarrateResult:
    joined = " ".join(s.text.strip() for s in segments)
    audio = tts.synthesize(joined, voice_id=voice_id, model_id=model_id)
    return NarrateResult(audio=audio, characters=len(joined), word_count=len(joined.split()))
