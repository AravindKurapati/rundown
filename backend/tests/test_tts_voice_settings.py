"""The real ElevenLabs client must send delivery settings, not render flat.

Passing no voice_settings renders at the voice default (high stability, no
style), which is the even, monotone read we explicitly do not want. The client
is never exercised in fakes mode, so this pins the behavior directly by faking
the SDK: no network, no keys.
"""
from app.config import settings


class _FakeTTS:
    """Stand-in for the ElevenLabs SDK that records the convert() kwargs."""

    def __init__(self, *args, **kwargs):
        self.last_kwargs = None
        self.text_to_speech = self

    def convert(self, **kwargs):
        self.last_kwargs = kwargs
        return [b"audio"]


def test_synthesize_passes_configured_voice_settings(monkeypatch):
    import app.adapters.elevenlabs_client as mod

    fake = _FakeTTS()
    monkeypatch.setattr(mod, "ElevenLabs", lambda *a, **k: fake)
    monkeypatch.setattr(settings, "tts_stability", 0.42)
    monkeypatch.setattr(settings, "tts_similarity", 0.78)
    monkeypatch.setattr(settings, "tts_style", 0.28)
    monkeypatch.setattr(settings, "tts_speaker_boost", True)

    client = mod.ElevenLabsClient()
    out = client.synthesize("hello", voice_id="v1", model_id="m1")

    assert out == b"audio"
    vs = fake.last_kwargs["voice_settings"]
    assert vs.stability == 0.42
    assert vs.similarity_boost == 0.78
    assert vs.style == 0.28
    assert vs.use_speaker_boost is True


def test_lower_stability_than_voice_default():
    # Guardrail on the default itself: the whole point is a livelier read than the
    # SDK's 0.5 default, so the shipped default must stay below it.
    assert settings.tts_stability < 0.5
    assert 0.0 <= settings.tts_style <= 0.6
