from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.store.db import init_db
from app.api import preferences, episodes, schedule, metrics

app = FastAPI(title="Rundown")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"],
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def _startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}


for r in (preferences.router, episodes.router, schedule.router, metrics.router):
    app.include_router(r)
