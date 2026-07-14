"""Per-segment synthesis: energy-modulated voice settings, prosody conditioning
on the surrounding script text, and provider-reported billing.

Conditioning uses previous_text/next_text rather than previous_request_ids:
request-id stitching is rejected outright on accounts with high privacy mode
(400 request_id_and_high_privacy, found on the first real run), while text
conditioning is in-request context that works everywhere.

The real client is never exercised in fakes mode, so these tests fake the SDK
surface (with_raw_response.convert) and pin what we send and what we read back:
no network, no keys.
"""
from contextlib import contextmanager

from app.config import settings
from app.adapters.elevenlabs_client import voice_settings_for_energy


class _Headers(dict):
    def get(self, key, default=None):  # httpx headers are case-insensitive
        return super().get(key.lower(), default)


class _FakeRawResponse:
    def __init__(self, headers: dict):
        self._response = type("R", (), {"headers": _Headers({k.lower(): v for k, v in headers.items()})})()
        self.data = [b"pcm-", b"bytes"]


class _FakeSDK:
    """Records convert() kwargs and serves canned headers."""

    def __init__(self, *args, **kwargs):
        self.calls: list[dict] = []
        self.headers = {"request-id": "req-1", "character-cost": "7"}
        self.text_to_speech = self
        self.with_raw_response = self

    @contextmanager
    def convert(self, **kwargs):
        self.calls.append(kwargs)
        yield _FakeRawResponse(self.headers)


def _client(monkeypatch):
    import app.adapters.elevenlabs_client as mod

    fake = _FakeSDK()
    monkeypatch.setattr(mod, "ElevenLabs", lambda *a, **k: fake)
    return mod.ElevenLabsClient(), fake


# ---- energy -> voice settings -------------------------------------------------

def test_high_energy_lowers_stability_and_raises_style(monkeypatch):
    monkeypatch.setattr(settings, "tts_stability", 0.42)
    monkeypatch.setattr(settings, "tts_style", 0.28)
    vs = voice_settings_for_energy("high")
    assert vs.stability == 0.30
    assert vs.style == 0.43


def test_calm_energy_raises_stability_and_lowers_style(monkeypatch):
    monkeypatch.setattr(settings, "tts_stability", 0.42)
    monkeypatch.setattr(settings, "tts_style", 0.28)
    vs = voice_settings_for_energy("calm")
    assert vs.stability == 0.52
    assert vs.style == 0.18


def test_warm_energy_is_the_base_settings(monkeypatch):
    monkeypatch.setattr(settings, "tts_stability", 0.42)
    monkeypatch.setattr(settings, "tts_style", 0.28)
    vs = voice_settings_for_energy("warm")
    assert vs.stability == 0.42
    assert vs.style == 0.28


def test_modulation_clamps_to_valid_range(monkeypatch):
    monkeypatch.setattr(settings, "tts_stability", 0.05)
    monkeypatch.setattr(settings, "tts_style", 0.95)
    vs = voice_settings_for_energy("high")
    assert vs.stability == 0.0
    assert vs.style == 1.0
    monkeypatch.setattr(settings, "tts_stability", 0.95)
    monkeypatch.setattr(settings, "tts_style", 0.03)
    vs = voice_settings_for_energy("calm")
    assert vs.stability == 1.0
    assert vs.style == 0.0


# ---- synthesize_segment -------------------------------------------------------

def test_segment_call_sends_pcm_energy_settings_and_text_conditioning(monkeypatch):
    client, fake = _client(monkeypatch)
    out = client.synthesize_segment(
        "Big news.", voice_id="v1", model_id="m1", energy="high",
        previous_text="Here is your rundown.", next_text="A quieter development.",
    )
    call = fake.calls[0]
    assert call["output_format"].startswith("pcm_")
    assert call["previous_text"] == "Here is your rundown."
    assert call["next_text"] == "A quieter development."
    assert "previous_request_ids" not in call  # rejected on high-privacy accounts
    assert call["voice_settings"].stability == voice_settings_for_energy("high").stability
    assert out.pcm == b"pcm-bytes"


def test_edge_segments_condition_on_one_side_only(monkeypatch):
    client, fake = _client(monkeypatch)
    client.synthesize_segment("Intro.", voice_id="v", model_id="m", energy="warm",
                              next_text="First story.")
    client.synthesize_segment("Outro.", voice_id="v", model_id="m", energy="warm",
                              previous_text="Last story.")
    assert fake.calls[0]["previous_text"] is None
    assert fake.calls[0]["next_text"] == "First story."
    assert fake.calls[1]["previous_text"] == "Last story."
    assert fake.calls[1]["next_text"] is None


def test_billed_chars_come_from_the_character_cost_header(monkeypatch):
    client, fake = _client(monkeypatch)
    out = client.synthesize_segment("Big news.", voice_id="v", model_id="m", energy="warm")
    assert out.billed_chars == 7  # header value, not len(text)


def test_billed_chars_fall_back_to_text_length_without_the_header(monkeypatch):
    client, fake = _client(monkeypatch)
    fake.headers = {"request-id": "req-2"}
    out = client.synthesize_segment("Big news.", voice_id="v", model_id="m", energy="warm")
    assert out.billed_chars == len("Big news.")
