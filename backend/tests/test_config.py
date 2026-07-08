from app.config import Settings


def test_defaults(monkeypatch):
    # Hermetic: clear any values a local .env may have loaded so we test true defaults.
    for var in ("LLM_MODEL_SCRIPT", "TTS_MODEL", "USE_FAKES"):
        monkeypatch.delenv(var, raising=False)
    s = Settings()
    assert s.llm_model_script == "gpt-5.5"
    assert s.tts_model == "eleven_multilingual_v2"
    assert s.use_fakes is True
    assert s.audio_dir.name == "audio"
