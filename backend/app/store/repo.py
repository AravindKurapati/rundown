from datetime import datetime, timezone
from sqlmodel import select
from app.store.db import get_session
from app.store.models import Preferences, Episode, GenerationEvent

# Fields a client may never write directly: the primary key and the audit
# timestamp. The server owns updated_at and re-stamps it on every save. This
# also stops a full GET-then-PUT round-trip from feeding the serialized
# updated_at string back into a datetime column.
_PREFS_READONLY = {"id", "updated_at"}


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
    with get_session() as s:
        rows = s.exec(select(Episode).where(Episode.status == "generating")).all()
        return len(rows) > 0
