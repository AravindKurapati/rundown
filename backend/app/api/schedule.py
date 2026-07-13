from fastapi import APIRouter
from app.store import repo
from app.store.metrics import next_run
from app.api.schemas import ScheduleUpdate

router = APIRouter(prefix="/api")


@router.get("/schedule")
def get_schedule():
    p = repo.get_preferences()
    return {"cadence": p.schedule_cadence, "time": p.schedule_time, "timezone": p.timezone,
            "next_run": next_run(p.schedule_cadence, p.schedule_time, p.timezone).isoformat()}


@router.put("/schedule")
def put_schedule(body: ScheduleUpdate):
    repo.save_preferences({
        "schedule_cadence": body.cadence, "schedule_time": body.time, "timezone": body.timezone,
    })
    return get_schedule()
