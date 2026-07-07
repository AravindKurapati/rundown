from fastapi import APIRouter
from app.store import repo

router = APIRouter(prefix="/api")


@router.get("/preferences")
def get_prefs():
    return repo.get_preferences()


@router.put("/preferences")
def put_prefs(body: dict):
    return repo.save_preferences(body)
