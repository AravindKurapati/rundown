from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse, Response
from app.store import repo
from app.pipeline.generator import generate_episode
from app.clients import get_clients

router = APIRouter(prefix="/api")


def _run(episode_id: int):
    source, llm, tts = get_clients()
    prefs = repo.get_preferences()
    generate_episode(episode_id, source, llm, tts, prefs)


@router.post("/episodes/generate", status_code=202)
def generate(background: BackgroundTasks):
    if repo.active_generation_exists():
        return JSONResponse(status_code=409, content={"error": {"code": "busy", "message": "A generation is already running"}})
    ep = repo.create_episode(status="generating")
    background.add_task(_run, ep.id)
    return {"episode_id": ep.id, "status": "generating"}


@router.get("/episodes")
def list_eps():
    return [
        {"id": e.id, "title": e.title, "status": e.status,
         "created_at": e.created_at.isoformat(), "duration_seconds": e.duration_seconds}
        for e in repo.list_episodes()
    ]


@router.get("/episodes/{episode_id}")
def get_ep(episode_id: int):
    ep = repo.get_episode(episode_id)
    if ep is None:
        return JSONResponse(status_code=404, content={"error": {"code": "not_found", "message": "no such episode"}})
    return ep


@router.get("/episodes/{episode_id}/audio")
def get_audio(episode_id: int):
    ep = repo.get_episode(episode_id)
    if ep is None or ep.status != "ready" or not ep.mp3_path:
        return Response(status_code=404)
    return FileResponse(ep.mp3_path, media_type="audio/mpeg")
