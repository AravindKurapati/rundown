import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


def _f(name: str, default: float) -> float:
    return float(os.getenv(name, default))


class Settings:
    def __init__(self) -> None:
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY", "")
        self.llm_model_script = os.getenv("LLM_MODEL_SCRIPT", "gpt-5.5")
        self.tts_model = os.getenv("TTS_MODEL", "eleven_multilingual_v2")
        self.tts_voice_a = os.getenv("TTS_VOICE_A", "onwK4e9ZLuTAKqWW03F9")  # premade "Daniel"
        # Delivery knobs. The voice default (high stability, zero style) reads flat
        # and even; a briefing wants emotional range. Lower stability lets pitch and
        # pace move line to line, a little style exaggeration adds warmth, speaker
        # boost keeps clarity. Podcast-leaning starting point, all overridable.
        self.tts_stability = _f("TTS_STABILITY", 0.42)
        self.tts_similarity = _f("TTS_SIMILARITY", 0.78)
        self.tts_style = _f("TTS_STYLE", 0.28)
        self.tts_speaker_boost = os.getenv("TTS_SPEAKER_BOOST", "1") == "1"
        # Segmented narration: one TTS call per segment in raw PCM, assembled
        # locally. "single" keeps the original one-call MP3 path as a fallback.
        self.narration_mode = os.getenv("NARRATION_MODE", "segmented")
        self.tts_pcm_format = os.getenv("TTS_PCM_FORMAT", "pcm_22050")
        self.pcm_rate = int(self.tts_pcm_format.rsplit("_", 1)[1])
        self.topic_ding = os.getenv("TOPIC_DING", "1") == "1"
        self.elevenlabs_rate_usd_per_1k = _f("ELEVENLABS_RATE_USD_PER_1K", 0.10)
        self.openai_rate_in = _f("OPENAI_RATE_USD_PER_1K_IN", 0.0005)
        self.openai_rate_out = _f("OPENAI_RATE_USD_PER_1K_OUT", 0.0015)
        self.budget_cap_usd = _f("BUDGET_CAP_USD", 20.0)
        self.use_fakes = os.getenv("USE_FAKES", "1") == "1"
        self.data_dir = Path(os.getenv("DATA_DIR", "data")).resolve()
        self.db_path = self.data_dir / "rundown.db"
        # Full SQLAlchemy URL (e.g. postgresql+psycopg://...); empty -> local SQLite.
        self.database_url = os.getenv("DATABASE_URL", "")
        self.audio_dir = self.data_dir / "audio"
        self.audio_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()
