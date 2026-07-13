import json
import time
from datetime import datetime, timezone
from dataclasses import asdict
from app.config import settings
from app.store import repo
from app.store.metrics import (
    episode_cost,
    budget_would_exceed,
    total_spent_usd,
    BudgetExceeded,
)
from app.pipeline.dedupe import dedupe
from app.pipeline.scriptwriter import write_script
from app.pipeline.narrate import narrate_single


def _stage(episode_id, name, fn):
    t0 = time.perf_counter()
    try:
        result = fn()
        ok, detail = True, None
        return result
    except Exception as e:  # noqa: BLE001
        ok, detail = False, str(e)
        raise
    finally:
        dur = int((time.perf_counter() - t0) * 1000)
        repo.add_event(episode_id, name, duration_ms=dur, ok=ok, detail=detail)


def generate_episode(episode_id, source, llm, tts, prefs):
    t0 = time.perf_counter()
    # Track the script outside the try so the failure path can bill the LLM spend
    # it already incurred if a later stage (budget gate, narrate, audio) fails.
    script = None
    try:
        # Parse inside the try so malformed preferences persist as a failed run
        # rather than crashing the caller with an uncaught error.
        interests = json.loads(prefs.interests_json)
        articles = _stage(episode_id, "gather",
                          lambda: [a for q in interests for a in source.fetch(q, limit=8)])
        articles = _stage(episode_id, "dedupe", lambda: dedupe(articles))
        script = _stage(episode_id, "script", lambda: write_script(llm, articles, prefs))

        # Budget gate: refuse before the expensive TTS call if this run's
        # projected cost would push committed spend past the cap. projected_chars
        # mirrors the exact string narrate_single joins and sends.
        projected_chars = len(" ".join(s.text.strip() for s in script.segments))
        projected = episode_cost(projected_chars, script.tokens_in, script.tokens_out)
        if budget_would_exceed(projected):
            raise BudgetExceeded(
                f"budget cap: projected ${projected:.2f} + spent "
                f"${total_spent_usd():.2f} exceeds cap ${settings.budget_cap_usd:.2f}"
            )

        narration = _stage(episode_id, "narrate",
                          lambda: narrate_single(tts, script.segments, prefs.voice_a, prefs.tts_model))

        path = settings.audio_dir / f"{episode_id}.mp3"
        path.write_bytes(narration.audio)

        cost = episode_cost(narration.characters, script.tokens_in, script.tokens_out)
        duration = int(narration.word_count / 150 * 60)
        return repo.update_episode(
            episode_id,
            status="ready",
            title=script.title,
            completed_at=datetime.now(timezone.utc),
            mp3_path=str(path),
            transcript_json=json.dumps([asdict(s) for s in script.segments]),
            duration_seconds=duration,
            word_count=narration.word_count,
            tts_characters=narration.characters,
            openai_tokens=script.tokens_in + script.tokens_out,
            est_cost_usd=cost,
            latency_ms=int((time.perf_counter() - t0) * 1000),
            source_count=len(articles),
            topics_json=json.dumps(interests),
        )
    except Exception as e:  # noqa: BLE001
        # A run that got past the script stage already spent OpenAI tokens, even
        # though it produced no episode. Record that LLM-only cost (tts_chars=0)
        # so the budget cap accounts for it; TTS is billed per completed
        # synthesis, which a failed run never got. Failures before the script
        # (gather/dedupe/bad prefs) spent nothing and record no cost.
        llm_cost = episode_cost(0, script.tokens_in, script.tokens_out) if script else None
        tokens = (script.tokens_in + script.tokens_out) if script else None
        return repo.update_episode(
            episode_id, status="failed", error=str(e),
            est_cost_usd=llm_cost, openai_tokens=tokens,
            latency_ms=int((time.perf_counter() - t0) * 1000),
        )
