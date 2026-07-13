from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.store.db import init_db
from app.api import preferences, episodes, schedule, metrics, voices


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Rundown", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"],
                   allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(RequestValidationError)
async def on_validation_error(request: Request, exc: RequestValidationError):
    """Wrap FastAPI's default {"detail": [...]} 422 in the same coded envelope the
    domain errors (404 not_found, 409 busy) use, so the whole API speaks one error
    shape. The per-field detail is preserved under "fields"."""
    return JSONResponse(
        status_code=422,
        content={"error": {
            "code": "invalid_request",
            "message": "Request failed validation",
            "fields": jsonable_encoder(exc.errors()),
        }},
    )


@app.get("/api/health")
def health():
    return {"status": "ok"}


for r in (preferences.router, episodes.router, schedule.router, metrics.router, voices.router):
    app.include_router(r)
