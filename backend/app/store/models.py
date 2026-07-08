from datetime import datetime, date, timezone
from typing import Optional
from sqlmodel import SQLModel, Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Preferences(SQLModel, table=True):
    id: int = Field(default=1, primary_key=True)
    interests_json: str = '["AI", "startups", "markets"]'
    tone: str = "sharp, warm, lightly witty"
    target_minutes: int = 5
    host_mode: str = "single"
    voice_a: str = "Rachel"
    voice_b: str = "Antoni"
    tts_model: str = "eleven_multilingual_v2"
    llm_model_select: str = "gpt-5-nano"
    llm_model_script: str = "gpt-5.5"
    schedule_cadence: str = "daily"
    schedule_time: str = "07:00"
    timezone: str = "America/New_York"
    budget_cap_usd: float = 20.0
    updated_at: datetime = Field(default_factory=_utcnow)


class Episode(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = ""
    status: str = "pending"
    created_at: datetime = Field(default_factory=_utcnow)
    completed_at: Optional[datetime] = None
    mp3_path: Optional[str] = None
    transcript_json: Optional[str] = None
    duration_seconds: Optional[int] = None
    word_count: Optional[int] = None
    tts_characters: Optional[int] = None
    openai_tokens: Optional[int] = None
    est_cost_usd: Optional[float] = None
    latency_ms: Optional[int] = None
    host_mode: str = "single"
    source_count: Optional[int] = None
    topics_json: Optional[str] = None
    error: Optional[str] = None


class GenerationEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    episode_id: int = Field(foreign_key="episode.id")
    stage: str
    started_at: datetime = Field(default_factory=_utcnow)
    ended_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    ok: bool = True
    detail: Optional[str] = None


class AnalyticsDaily(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    day: date
    is_mock: bool = True
    dau: int = 0
    wau: int = 0
    mau: int = 0
    episodes: int = 0
    listen_through_rate: float = 0.0
    completion_rate: float = 0.0
    est_cost_usd: float = 0.0
