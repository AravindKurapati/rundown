from fastapi import APIRouter
from app.store import metrics

router = APIRouter(prefix="/api/metrics")


@router.get("/overview")
def overview():
    return metrics.overview()


@router.get("/timeseries")
def timeseries(metric: str, days: int = 30):
    return metrics.timeseries(metric, days)


@router.get("/pipeline")
def pipeline():
    return metrics.last_pipeline()
