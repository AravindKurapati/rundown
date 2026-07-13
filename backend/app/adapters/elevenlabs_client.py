from elevenlabs.client import ElevenLabs
from app.config import settings
from app.adapters.retry import transient_retry

# TTS for a full episode runs tens of seconds; this ceiling stops a wedged
# connection from hanging the run without cutting off a legitimate synthesis.
_TIMEOUT_S = 180.0


class ElevenLabsClient:
    def __init__(self):
        self._c = ElevenLabs(api_key=settings.elevenlabs_api_key, timeout=_TIMEOUT_S)

    @transient_retry
    def synthesize(self, text: str, voice_id: str, model_id: str) -> bytes:
        stream = self._c.text_to_speech.convert(
            text=text, voice_id=voice_id, model_id=model_id, output_format="mp3_44100_128",
        )
        return b"".join(stream)

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
