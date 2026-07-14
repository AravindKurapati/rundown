import time
from dataclasses import dataclass
from app.adapters.base import TTSClient
from app.config import settings
from app.pipeline import assembly
from app.pipeline.scriptwriter import Segment


@dataclass
class NarrateResult:
    audio: bytes
    characters: int
    word_count: int


@dataclass
class SegmentedNarrateResult:
    audio: bytes  # assembled MP3
    characters: int  # provider-billed characters across all calls
    word_count: int
    duration_seconds: int  # exact, from assembled PCM byte count
    calls: list[dict]  # per-segment telemetry: index, kind, energy, chars, ms


class SegmentedNarrationError(Exception):
    """A segment call failed partway through. Carries the characters the
    provider already billed for the segments that completed, so the failure
    path can count that spend against the budget."""

    def __init__(self, cause: Exception, billed_chars: int) -> None:
        super().__init__(f"narration failed after {billed_chars} billed chars: {cause}")
        self.billed_chars = billed_chars


def narrate_single(tts: TTSClient, segments: list[Segment], voice_id: str, model_id: str) -> NarrateResult:
    joined = " ".join(s.text.strip() for s in segments)
    audio = tts.synthesize(joined, voice_id=voice_id, model_id=model_id)
    return NarrateResult(audio=audio, characters=len(joined), word_count=len(joined.split()))


def narrate_segmented(
    tts: TTSClient, segments: list[Segment], voice_id: str, model_id: str
) -> SegmentedNarrateResult:
    """One TTS call per segment, each delivered at the segment's energy and
    stitched to the prior calls' prosody, assembled locally into one MP3."""
    rate = settings.pcm_rate
    chunks: list[tuple[str, bytes]] = []
    calls: list[dict] = []
    request_ids: list[str] = []
    billed = 0
    for i, seg in enumerate(segments):
        t0 = time.perf_counter()
        try:
            out = tts.synthesize_segment(
                seg.text.strip(), voice_id=voice_id, model_id=model_id,
                energy=seg.energy, previous_request_ids=list(request_ids),
            )
        except Exception as e:  # noqa: BLE001
            raise SegmentedNarrationError(e, billed) from e
        billed += out.billed_chars
        if out.request_id:
            request_ids.append(out.request_id)
        chunks.append((seg.kind, out.pcm))
        calls.append({
            "index": i, "kind": seg.kind, "energy": seg.energy,
            "chars": out.billed_chars, "ms": int((time.perf_counter() - t0) * 1000),
        })
    pcm = assembly.assemble(chunks, rate, with_ding=settings.topic_ding)
    return SegmentedNarrateResult(
        audio=assembly.encode_mp3(pcm, rate),
        characters=billed,
        word_count=sum(len(s.text.split()) for s in segments),
        duration_seconds=assembly.duration_seconds(pcm, rate),
        calls=calls,
    )
