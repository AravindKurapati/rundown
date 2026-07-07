import json
from app.adapters.fakes import FakeLLMClient, FakeTTSClient


def test_fake_llm_returns_segment_json():
    llm = FakeLLMClient()
    res = llm.complete("sys", "Articles: A; B; C", model="x")
    data = json.loads(res.text)
    # Mirrors the real provider: json_object mode returns {"segments": [...]}.
    assert isinstance(data, dict) and data["segments"][0]["kind"] == "intro"
    assert res.tokens_in > 0 and res.tokens_out > 0


def test_fake_tts_records_one_call_and_returns_bytes():
    tts = FakeTTSClient()
    audio = tts.synthesize("hello world", voice_id="Rachel", model_id="m")
    assert audio.startswith(b"ID3") or len(audio) > 0
    assert len(tts.calls) == 1
