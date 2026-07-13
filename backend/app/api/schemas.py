"""Request bodies for the mutating endpoints. Validating here turns malformed
input into a 422 with a field-level message instead of a 500 from a KeyError or
a ZoneInfo lookup deep in the handler.
"""
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, field_validator


def _validate_timezone(v: str) -> str:
    try:
        ZoneInfo(v)
    except (ZoneInfoNotFoundError, ValueError):
        raise ValueError(f"unknown timezone: {v!r}")
    return v


def _validate_hhmm(v: str) -> str:
    try:
        hh, mm = (int(x) for x in v.split(":"))
    except (ValueError, TypeError):
        raise ValueError("time must be HH:MM")
    if not (0 <= hh < 24 and 0 <= mm < 60):
        raise ValueError("time must be HH:MM within 00:00-23:59")
    return v


class ScheduleUpdate(BaseModel):
    cadence: str
    time: str
    timezone: str

    @field_validator("cadence")
    @classmethod
    def _cadence(cls, v: str) -> str:
        if v not in ("daily", "weekly"):
            raise ValueError("cadence must be 'daily' or 'weekly'")
        return v

    _tz = field_validator("timezone")(_validate_timezone)
    _time = field_validator("time")(_validate_hhmm)


class PreferencesUpdate(BaseModel):
    """Partial update. Every field is optional (the frontend GETs then PUTs the
    whole object, but callers may send a subset); unknown or read-only keys such
    as id / updated_at are ignored rather than rejected."""

    model_config = ConfigDict(extra="ignore")

    interests_json: Optional[str] = None
    tone: Optional[str] = None
    target_minutes: Optional[int] = None
    host_mode: Optional[str] = None
    voice_a: Optional[str] = None
    voice_b: Optional[str] = None
    tts_model: Optional[str] = None
    llm_model_script: Optional[str] = None
    schedule_cadence: Optional[str] = None
    schedule_time: Optional[str] = None
    timezone: Optional[str] = None
    budget_cap_usd: Optional[float] = None

    @field_validator("target_minutes")
    @classmethod
    def _minutes(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("target_minutes must be positive")
        return v

    @field_validator("budget_cap_usd")
    @classmethod
    def _cap(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("budget_cap_usd must be positive")
        return v

    @field_validator("schedule_cadence")
    @classmethod
    def _cadence(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("daily", "weekly"):
            raise ValueError("schedule_cadence must be 'daily' or 'weekly'")
        return v

    @field_validator("timezone")
    @classmethod
    def _tz(cls, v: Optional[str]) -> Optional[str]:
        return v if v is None else _validate_timezone(v)

    @field_validator("schedule_time")
    @classmethod
    def _time(cls, v: Optional[str]) -> Optional[str]:
        return v if v is None else _validate_hhmm(v)
