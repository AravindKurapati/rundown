from datetime import datetime, timedelta, timezone
from sqlmodel import select
from app.store.db import get_session
from app.store.models import Preferences, Episode, GenerationEvent

# Fields a client may never write directly: the primary key and the audit
# timestamp. The server owns updated_at and re-stamps it on every save. This
# also stops a full GET-then-PUT round-trip from feeding the serialized
# updated_at string back into a datetime column.
_PREFS_READONLY = {"id", "updated_at"}

# A "generating" row older than this is treated as an abandoned run (the process
# crashed before it could mark itself failed). Real runs finish in a few minutes;
# this cutoff sits well beyond the slowest observed run so it never trips a live
# generation, only a dead one.
STALE_GENERATION_AFTER = timedelta(minutes=15)


def get_preferences() -> Preferences:
    with get_session() as s:
        return s.get(Preferences, 1)


def save_preferences(data: dict) -> Preferences:
    with get_session() as s:
        p = s.get(Preferences, 1)
        for k, v in data.items():
            if k in _PREFS_READONLY:
                continue
            if hasattr(p, k):
                setattr(p, k, v)
        p.updated_at = datetime.now(timezone.utc)
        s.add(p)
        s.commit()
        s.refresh(p)
        return p


def create_episode(**kw) -> Episode:
    with get_session() as s:
        ep = Episode(**kw)
        s.add(ep)
        s.commit()
        s.refresh(ep)
        return ep


def update_episode(episode_id: int, **kw) -> Episode:
    with get_session() as s:
        ep = s.get(Episode, episode_id)
        for k, v in kw.items():
            setattr(ep, k, v)
        s.add(ep)
        s.commit()
        s.refresh(ep)
        return ep


def get_episode(episode_id: int) -> Episode | None:
    with get_session() as s:
        return s.get(Episode, episode_id)


def list_episodes() -> list[Episode]:
    with get_session() as s:
        return list(s.exec(select(Episode).order_by(Episode.created_at.desc())))


def add_event(episode_id: int, stage: str, **kw) -> GenerationEvent:
    with get_session() as s:
        ev = GenerationEvent(episode_id=episode_id, stage=stage, **kw)
        s.add(ev)
        s.commit()
        s.refresh(ev)
        return ev


def active_generation_exists() -> bool:
    """True only if a *fresh* generation is running. A 'generating' row older than
    STALE_GENERATION_AFTER is reclaimed (marked failed) rather than treated as a
    live run, so a crashed generation can't lock the endpoint behind a permanent
    409. Reconciliation is lazy: it happens the next time anyone asks."""
    cutoff = datetime.now(timezone.utc) - STALE_GENERATION_AFTER
    with get_session() as s:
        rows = list(s.exec(select(Episode).where(Episode.status == "generating")))
        fresh = False
        for ep in rows:
            created = ep.created_at
            # SQLite hands datetimes back naive; treat a naive value as the UTC we
            # stored so the comparison stays honest across the tz boundary.
            if created is not None and created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if created is None or created < cutoff:
                ep.status = "failed"
                ep.error = ep.error or "generation abandoned (stale lease reclaimed)"
                s.add(ep)
            else:
                fresh = True
        s.commit()
        return fresh
