# Rundown

A personal daily news podcast, generated on your machine, for well under a dollar an episode at the default rates.

Tell Rundown what you care about and it produces a five-minute briefing you would actually listen to: it gathers fresh news on your interests, picks the stories worth your time, writes a script with a point of view, and reads it aloud in a good voice. The idea underneath is restraint: exactly two paid API calls per episode. One structured LLM call both selects the stories and writes the full segmented script, and one TTS call renders it. Everything else is free, local, and deterministic.

## How it works

A generation runs as a straight pipeline:

```
interests
   |
   v
gather (Google News RSS, free)      one item per story, many overlapping
   |
   v
dedupe (deterministic, free)        collapse syndicated duplicates
   |
   v
script  (1 LLM call, paid)          select 4-6 stories, order them,
   |                                write segments: {kind, speaker, text}
   v
narrate (1 TTS call, paid)          join segments, synthesize one MP3
   |
   v
persist (SQLite + local MP3)        transcript + per-stage timing + cost
```

The single LLM call does the editorial work: choose the best stories, order them for pacing, and write the script as an ordered list of segments, each tagged with a `kind` (intro, story, transition, outro), a `speaker`, and pure spoken `text`. The segments are joined and sent to ElevenLabs in one call, and out comes an MP3, a transcript, and per-stage timing and cost written to SQLite.

The React app is two pages: a **Studio** for preferences, generation, and playback, and a **Dashboard** showing real run metrics alongside clearly labeled mock product analytics.

The segment contract is host-agnostic on purpose. Single-host is what ships: every segment uses one speaker and one voice, so the whole script is a single TTS call. Two-host is the same contract with alternating `host_a` and `host_b` speakers. The prompt can already write it and there is a sample script in the repo, but per-speaker narration (synthesize each turn, stitch, loudness-normalize) is not wired up. It is a documented extension, not a claim. See `solution.md`.

## Run it locally

You need Python 3.11+ and Node 18+.

```
cp .env.example backend/.env            # keys optional while USE_FAKES=1
make setup                              # backend (pip -e) + frontend (npm install)
make test                               # offline test suite, no network, no spend
```

With `USE_FAKES=1` (the default in `.env.example`) the LLM and TTS clients are fakes: everything runs offline and free, no keys needed. Add your OpenAI and ElevenLabs keys and set `USE_FAKES=0` for real episodes.

Start the app with one command, any OS:

```
python dev.py     # API on :8000, UI on :5173; Ctrl-C stops both
```

Then open http://localhost:5173. `make dev` runs the same thing. Prefer two terminals? That works too:

```
# terminal 1: API on http://localhost:8000
cd backend && uvicorn app.main:app --reload --port 8000

# terminal 2: UI on http://localhost:5173
cd frontend && npm run dev
```

Other targets:

```
make seed      # 90 days of clearly-flagged mock analytics for the Dashboard
make sample    # one REAL end-to-end generation, writes sample.mp3 (spends budget)
```

## Scheduling

Generation is a headless CLI, not an in-process scheduler, so the operating system does the timing and there is nothing to restart:

```
cd backend && USE_FAKES=0 python -m app.generate     # generate one episode now
```

Wire it to cron (Unix) or Task Scheduler (Windows). Example crontab for 7am daily:

```
0 7 * * *  cd /path/to/rundown/backend && USE_FAKES=0 /path/to/python -m app.generate
```

The schedule cadence and time you set in the Studio are saved as preferences and drive a computed next-run readout; the actual firing is whatever cron entry you install. The API and the CLI generate through the same code path.

## Design decisions

- **One LLM call selects and writes.** The model that picks the stories is the model shaping the narrative, so pacing is coherent and cost is one call, not five.
- **Premium where it is heard, cheap where it is invisible.** A quality voice and a capable model for the script; the small model tier for the selection reasoning the listener never hears. All model ids and rates are configurable in `.env`.
- **Fake LLM and TTS adapters behind the same interfaces.** Dev, tests, and CI cost nothing and never flake on the network. The fake TTS records its calls, so a test can assert the load-bearing property: exactly one synthesis call per episode.
- **Scheduling is persisted config plus a headless CLI**, not an in-process scheduler with restart and duplicate-run problems.
- **SQLite and local MP3 files.** The right size for one listener on one machine. The engine reads a `DATABASE_URL`, so Postgres is a connection string away (plus a driver and migrations); object storage stays documented, not built.
- **Dashboard honesty.** Real metrics (latency, cost, success rate) come from real runs. Mock product analytics (DAU, listen-through) carry an `is_mock` flag in the data and a "Mock data, not real" badge everywhere they render in the UI.

See `solution.md` for the full trade-off reasoning and `SCHEMA.md` for the data model.
