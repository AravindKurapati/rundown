from app.config import Settings


def test_defaults(monkeypatch):
    monkeypatch.delenv("LLM_MODEL_SCRIPT", raising=False)
    s = Settings()
    assert s.llm_model_script == "gpt-5.5"
    assert s.tts_model == "eleven_multilingual_v2"
    assert s.use_fakes is True
    assert s.audio_dir.name == "audio"
