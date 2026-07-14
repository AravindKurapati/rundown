from elevenlabs import VoiceSettings
from elevenlabs.client import ElevenLabs
from app.adapters.base import SegmentAudio
from app.config import settings
from app.adapters.retry import transient_retry

# TTS for a full episode runs tens of seconds; this ceiling stops a wedged
# connection from hanging the run without cutting off a legitimate synthesis.
_TIMEOUT_S = 180.0

# How a segment's energy bends the base delivery, as (stability, style) deltas.
# Modest on purpose: request stitching keeps prosody continuous across segments,
# and a large swing fights it. The listener should hear the same host getting
# more animated, not a different person.
_ENERGY_DELTAS = {"high": (-0.12, +0.15), "calm": (+0.10, -0.10), "warm": (0.0, 0.0)}

# ElevenLabs allows conditioning on at most the last 3 prior requests.
_STITCH_WINDOW = 3


def _clamp(v: float) -> float:
    return min(1.0, max(0.0, round(v, 4)))


def voice_settings_for_energy(energy: str) -> VoiceSettings:
    """The configured base delivery, bent by a segment's energy and clamped to
    the valid [0, 1] range. Unknown energies render as the base ("warm")."""
    d_stability, d_style = _ENERGY_DELTAS.get(energy, (0.0, 0.0))
    return VoiceSettings(
        stability=_clamp(settings.tts_stability + d_stability),
        similarity_boost=settings.tts_similarity,
        style=_clamp(settings.tts_style + d_style),
        use_speaker_boost=settings.tts_speaker_boost,
    )


class ElevenLabsClient:
    def __init__(self):
        self._c = ElevenLabs(api_key=settings.elevenlabs_api_key, timeout=_TIMEOUT_S)
        # Passing no settings renders at the voice default: high stability, no
        # style, which is exactly the flat, even read we do not want. These give
        # the delivery loud/soft range without drifting into erratic pacing.
        self._voice_settings = VoiceSettings(
            stability=settings.tts_stability,
            similarity_boost=settings.tts_similarity,
            style=settings.tts_style,
            use_speaker_boost=settings.tts_speaker_boost,
        )

    @transient_retry
    def synthesize(self, text: str, voice_id: str, model_id: str) -> bytes:
        stream = self._c.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id=model_id,
            output_format="mp3_44100_128",
            voice_settings=self._voice_settings,
        )
        return b"".join(stream)

    @transient_retry
    def synthesize_segment(
        self,
        text: str,
        voice_id: str,
        model_id: str,
        energy: str = "warm",
        previous_request_ids: list[str] | None = None,
    ) -> SegmentAudio:
        """One segment as raw PCM, delivered at the segment's energy and stitched
        to the prior segments' prosody. Returns the provider's request id (for the
        next segment's stitching) and the billed character count from the
        character-cost header, so cost accounting reports actuals, not estimates."""
        window = list(previous_request_ids or [])[-_STITCH_WINDOW:]
        with self._c.text_to_speech.with_raw_response.convert(
            text=text,
            voice_id=voice_id,
            model_id=model_id,
            output_format=settings.tts_pcm_format,
            voice_settings=voice_settings_for_energy(energy),
            previous_request_ids=window,
        ) as response:
            headers = response._response.headers
            pcm = b"".join(response.data)
        billed = headers.get("character-cost")
        return SegmentAudio(
            pcm=pcm,
            request_id=headers.get("request-id"),
            billed_chars=int(billed) if billed and str(billed).isdigit() else len(text),
        )

    def list_voices(self) -> list[dict]:
        """Voices available on this account, as {id, name, description}."""
        resp = self._c.voices.get_all()
        out = []
        for v in resp.voices:
            labels = getattr(v, "labels", None) or {}
            description = (
                getattr(v, "description", None)
                or labels.get("description")
                or ", ".join(
                    labels[k] for k in ("gender", "accent", "age", "use_case") if labels.get(k)
                )
                or "ElevenLabs voice"
            )
            out.append({"id": v.voice_id, "name": v.name, "description": description})
        return out
