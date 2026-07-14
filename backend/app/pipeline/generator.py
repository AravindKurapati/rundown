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
from app.pipeline.narrate import narrate_single, narrate_segmented


def _stage(episode_id, name, fn, detail_of=None):
    t0 = time.perf_counter()
    try:
        result = fn()
        ok, detail = True, (detail_of(result) if detail_of else None)
        return result
    except Exception as e:  # noqa: BLE001
        ok, detail = False, str(e)
        raise
    finally:
        dur = int((time.perf_counter() - t0) * 1000)
        repo.add_event(episode_id, name, duration_ms=dur, ok=ok, detail=detail)


def generate_episode(episode_id, source, llm, tts, prefs):
    t0 = time.perf_counter()
    # Track script and narration outside the try so the failure path can bill the
    # spend already incurred if a later stage fails: LLM tokens once the script
    # exists, plus TTS characters if narration completed before the audio write.
    script = None
    narration = None
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

        if settings.narration_mode == "single":
            narration = _stage(episode_id, "narrate",
                               lambda: narrate_single(tts, script.segments, prefs.voice_a, prefs.tts_model))
            # Estimated from speaking pace; segmented mode below measures for real.
            duration = int(narration.word_count / 150 * 60)
        else:
            narration = _stage(episode_id, "narrate",
                               lambda: narrate_segmented(tts, script.segments, prefs.voice_a, prefs.tts_model),
                               detail_of=lambda r: json.dumps({"calls": r.calls}))
            duration = narration.duration_seconds

        path = settings.audio_dir / f"{episode_id}.mp3"
        path.write_bytes(narration.audio)

        cost = episode_cost(narration.characters, script.tokens_in, script.tokens_out)
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
        # Record the spend already incurred: LLM tokens once the script exists,
        # plus TTS characters if narration completed (e.g. a failure on the audio
        # write, after the provider already billed the synthesis). Failures before
        # the script (gather/dedupe/bad prefs) spent nothing and record no cost.
        if script:
            # A narration that failed partway still billed the completed segments;
            # the error carries that count so the cap sees the real spend.
            synthesized = narration.characters if narration else getattr(e, "billed_chars", 0)
            cost = episode_cost(synthesized, script.tokens_in, script.tokens_out)
            tokens = script.tokens_in + script.tokens_out
            tts_chars = synthesized or None
        else:
            cost = tokens = tts_chars = None
        return repo.update_episode(
            episode_id, status="failed", error=str(e),
            est_cost_usd=cost, openai_tokens=tokens, tts_characters=tts_chars,
            latency_ms=int((time.perf_counter() - t0) * 1000),
        )
