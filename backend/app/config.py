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
        self.tts_voice_a = os.getenv("TTS_VOICE_A", "21m00Tcm4TlvDq8ikWAM")
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
