import json

from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse, Response
from app.config import settings
from app.store import repo, metrics
from app.api.voices import voice_name_for
from app.api.schemas import EpisodeSummaryOut, EpisodeDetailOut
from app.pipeline.generator import generate_episode
from app.clients import get_clients

router = APIRouter(prefix="/api")

# Speaking rate used to project a run's size before we make it. Calibrated to the
# real sample (~880 chars/min → the observed $0.42 for a 4.8-min episode).
CHARS_PER_MINUTE = 900


def _run(episode_id: int):
    source, llm, tts = get_clients()
    prefs = repo.get_preferences()
    generate_episode(episode_id, source, llm, tts, prefs)


@router.get("/episodes/estimate")
def estimate():
    """Project a run's cost from the current preferences, using the same rate and
    budget helpers the pipeline uses. Read-only; makes nothing."""
    p = repo.get_preferences()
    minutes = p.target_minutes
    chars = int(minutes * CHARS_PER_MINUTE)
    est = metrics.episode_cost(chars, tokens_in=1500, tokens_out=minutes * 200)
    try:
        topics = json.loads(p.interests_json)
        if not isinstance(topics, list):
            topics = []
    except (ValueError, TypeError):
        topics = []
    spent = metrics.total_spent_usd()
    cap = settings.budget_cap_usd
    return {
        "minutes": minutes,
        "est_chars": chars,
        "est_cost_usd": round(est, 2),
        "topics": [str(t) for t in topics],
        "voice_id": p.voice_a,
        "voice_name": voice_name_for(p.voice_a),
        "spent_usd": round(spent, 2),
        "budget_cap_usd": cap,
        "remaining_usd": round(cap - spent, 2),
        "would_exceed_budget": metrics.budget_would_exceed(est),
        "offline": settings.use_fakes,
    }


@router.post("/episodes/generate", status_code=202)
def generate(background: BackgroundTasks):
    if repo.active_generation_exists():
        return JSONResponse(status_code=409, content={"error": {"code": "busy", "message": "A generation is already running"}})
    ep = repo.create_episode(status="generating")
    background.add_task(_run, ep.id)
    return {"episode_id": ep.id, "status": "generating"}


@router.get("/episodes", response_model=list[EpisodeSummaryOut])
def list_eps():
    return [
        {"id": e.id, "title": e.title, "status": e.status,
         "created_at": e.created_at.isoformat(), "duration_seconds": e.duration_seconds}
        for e in repo.list_episodes()
    ]


@router.get("/episodes/{episode_id}", response_model=EpisodeDetailOut)
def get_ep(episode_id: int):
    ep = repo.get_episode(episode_id)
    if ep is None:
        return JSONResponse(status_code=404, content={"error": {"code": "not_found", "message": "no such episode"}})
    # Explicit projection: never surface mp3_path (an internal filesystem path).
    # The audio is served through GET /episodes/{id}/audio instead.
    return {
        "id": ep.id,
        "title": ep.title,
        "status": ep.status,
        "created_at": ep.created_at.isoformat() if ep.created_at else None,
        "completed_at": ep.completed_at.isoformat() if ep.completed_at else None,
        "transcript_json": ep.transcript_json,
        "duration_seconds": ep.duration_seconds,
        "word_count": ep.word_count,
        "tts_characters": ep.tts_characters,
        "openai_tokens": ep.openai_tokens,
        "est_cost_usd": ep.est_cost_usd,
        "latency_ms": ep.latency_ms,
        "host_mode": ep.host_mode,
        "source_count": ep.source_count,
        "topics_json": ep.topics_json,
        "error": ep.error,
    }


@router.get("/episodes/{episode_id}/audio")
def get_audio(episode_id: int):
    ep = repo.get_episode(episode_id)
    if ep is None or ep.status != "ready" or not ep.mp3_path:
        return Response(status_code=404)
    return FileResponse(ep.mp3_path, media_type="audio/mpeg")
