from fastapi import APIRouter
from app.store import repo
from app.api.schemas import PreferencesUpdate

router = APIRouter(prefix="/api")


@router.get("/preferences")
def get_prefs():
    return repo.get_preferences()


@router.put("/preferences")
def put_prefs(body: PreferencesUpdate):
    # exclude_unset: apply only the fields the client actually sent, preserving
    # partial-update semantics (unsent fields keep their stored value).
    return repo.save_preferences(body.model_dump(exclude_unset=True))
