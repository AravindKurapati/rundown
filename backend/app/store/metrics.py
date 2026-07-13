from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from sqlmodel import select
from app.config import settings
from app.store.db import get_session
from app.store.models import Episode, AnalyticsDaily, GenerationEvent


def episode_cost(tts_chars: int, tokens_in: int, tokens_out: int) -> float:
    tts = tts_chars / 1000 * settings.elevenlabs_rate_usd_per_1k
    llm = tokens_in / 1000 * settings.openai_rate_in + tokens_out / 1000 * settings.openai_rate_out
    return round(tts + llm, 4)


class BudgetExceeded(Exception):
    """A generation run's projected cost would cross the budget cap."""


def total_spent_usd() -> float:
    """Committed spend so far: sum of est_cost_usd over ready episodes."""
    with get_session() as s:
        eps = list(s.exec(select(Episode).where(Episode.status == "ready")))
    return sum(e.est_cost_usd or 0.0 for e in eps)


def budget_would_exceed(projected_usd: float) -> bool:
    """True if committed spend plus this run's projected cost strictly exceeds the cap."""
    return total_spent_usd() + projected_usd > settings.budget_cap_usd


def overview() -> dict:
    with get_session() as s:
        eps = list(s.exec(select(Episode)))
    done = [e for e in eps if e.status in ("ready", "failed")]
    ready = [e for e in eps if e.status == "ready"]
    success = (len(ready) / len(done)) if done else 0.0
    latencies = [e.latency_ms for e in ready if e.latency_ms]
    chars = sum(e.tts_characters or 0 for e in ready)
    cost = round(sum(e.est_cost_usd or 0 for e in ready), 2)
    cap = settings.budget_cap_usd
    return {
        "episodes": len(eps),
        "success_rate": round(success, 3),
        "avg_latency_ms": int(sum(latencies) / len(latencies)) if latencies else 0,
        "tts_chars_total": chars,
        "est_cost_total_usd": cost,
        "budget_cap_usd": cap,
        "budget_used_pct": round((cost / cap * 100) if cap else 0, 1),
    }


def last_pipeline() -> dict:
    """Per-stage telemetry for the most recent run (gather/dedupe/script/narrate),
    straight from the generation_event rows the pipeline writes."""
    with get_session() as s:
        ep = s.exec(select(Episode).order_by(Episode.id.desc())).first()
        if ep is None:
            return {"run_at": None, "stages": []}
        events = list(
            s.exec(
                select(GenerationEvent)
                .where(GenerationEvent.episode_id == ep.id)
                .order_by(GenerationEvent.id)
            )
        )
    stages = [
        {"stage": e.stage, "duration_ms": e.duration_ms or 0, "ok": bool(e.ok)}
        for e in events
    ]
    return {"run_at": ep.created_at.isoformat() if ep.created_at else None, "stages": stages}


def timeseries(metric: str, days: int) -> list[dict]:
    with get_session() as s:
        rows = list(s.exec(select(AnalyticsDaily).order_by(AnalyticsDaily.day)))
    out = []
    for r in rows[-days:]:
        val = getattr(r, metric, None)
        if val is None:
            continue
        out.append({"date": r.day.isoformat(), "value": val, "is_mock": r.is_mock})
    return out


def next_run(cadence: str, time_str: str, tz_name: str, now: datetime | None = None) -> datetime:
    tz = ZoneInfo(tz_name)
    now = now or datetime.now(tz)
    hh, mm = (int(x) for x in time_str.split(":"))
    candidate = now.replace(hour=hh, minute=mm, second=0, microsecond=0)
    if candidate <= now:
        step = {"daily": 1, "weekly": 7}.get(cadence, 1)
        candidate = candidate + timedelta(days=step)
    return candidate
