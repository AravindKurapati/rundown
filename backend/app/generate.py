"""Headless one-shot generation. Cron/Task Scheduler target. Respects USE_FAKES."""
from app.store.db import init_db
from app.store import repo
from app.clients import get_clients
from app.pipeline.generator import generate_episode


def run_once() -> int:
    init_db()
    prefs = repo.get_preferences()
    ep = repo.create_episode(status="generating", host_mode=prefs.host_mode)
    source, llm, tts = get_clients()
    out = generate_episode(ep.id, source, llm, tts, prefs)
    print(f"episode {out.id}: {out.status}")
    return out.id


if __name__ == "__main__":
    run_once()
