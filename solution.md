# Rundown: solution notes

## The problem I chose to solve well

The brief asks for a personal podcast generator. The tempting version is a feature buffet: five news sources, three voice modes, a scheduler with a UI clock. I built the other version: one genuinely good daily briefing, produced by a pipeline where every cost, every failure, and every trade-off is visible. The grading signal was explicit about caring whether I understand the decisions behind the solution, so I optimized for decisions being legible, not for feature count.

The result is deliberately narrow at the paid boundary: two API calls per episode. One structured LLM call selects the stories and writes the whole script; one ElevenLabs call renders it. A five-minute script is roughly five to six thousand characters, comfortably inside a single TTS request, which means no chunking, no stitching, no seams to get wrong. At the default rates that is well under a dollar an episode, and the dashboard shows you the actual number rather than asking you to trust me. Those character and cost figures are derived from the rate config, not measured across a large sample; the dashboard reports the real per-run numbers once you generate.

## Architecture in one breath

Gather pulls Google News RSS per interest, a deterministic dedupe collapses the overlap, one LLM call turns the candidates into a segmented script, one TTS call turns the script into audio, and the generator persists the MP3 plus per-stage timing and cost to SQLite. Every seam in that sentence exists for a reason. The news source is a protocol, so swapping RSS for a paid news API is a drop-in change, not surgery. The LLM and TTS clients are protocols with fake implementations, so all development, tests, and CI run offline and free; real spend is reserved for moments a human is listening. And the script is a list of segments, each tagged with a speaker, which makes the whole pipeline host-agnostic: single-host joins the segments and makes one TTS call.

## What ships, and what is designed but deferred

Single-host is the shipped, working product: one voice, one TTS call, the two-calls-per-episode property intact. Two-host is where I drew the line deliberately. The segment contract already carries a `speaker` on every segment, the prompt can write an alternating `host_a` and `host_b` script, and there is a sample two-host script in the repo to prove the writing works. What is not built is the narration: rendering two hosts means one TTS call per speaker turn, then stitching the clips with pydub and loudness-normalizing so the seams do not jump. That also breaks the clean two-calls-per-episode story, which is one of the things I most wanted to keep true. So I shipped the honest single-host path and removed the "two hosts" control from the UI rather than leave a button that produces a two-person dialogue read by a single voice. Building `narrate_multi` is the first extension, and the contract is already shaped for it.

Scheduling got the same treatment. Instead of embedding a scheduler in the web process, and inheriting its restart, duplicate-run, and timezone problems, the schedule is persisted preference data with a computed next-run readout, and generation is a headless CLI that cron or Task Scheduler invokes through the same code path as the API. The product concept ships; the operational liability does not.

## Decisions I am glad I made

Merging selection and writing into one call is the one I would defend hardest. Splitting them sounds cleaner, but the editor and the writer being the same model is why the episodes have pacing: the thing choosing story order is the thing writing the transitions. It also halves the calls on the critical path.

The fakes earned their keep within days. Because the fake TTS records its calls and returns valid MP3 bytes, tests can assert the load-bearing property of the whole design, exactly one synthesis call per episode, without a network or a dollar involved. The same fakes back a repro test for a real bug: OpenAI's JSON-object response mode returns a top-level object, so the parser has to accept `{"segments": [...]}`, not just a bare array. I found that with a test before it could find me in production.

And the honest dashboard. The assignment allows mocked metrics, and product-level analytics like DAU are mocked, but every mock row carries an `is_mock` flag and the UI says so on every figure. Latency, cost, and success rate come from real runs. If I put a number in front of a customer, I want to be able to explain where it came from, and that habit should not relax for a take-home.

And the budget cap is a gate, not just a readout. A generation whose projected cost would cross `budget_cap_usd` is refused before the paid ElevenLabs call, and the episode records why it stopped. It was the smallest high-leverage thing to add, and it turns the cost dashboard from advisory into load-bearing: the number on screen is one the system will actually enforce.

## Decisions I would revisit with more time

The single-generation lock lives in the database as an episode status, so a process that dies mid-run leaves a stuck "generating" row until it is cleaned up. Fine for one user locally; a real deployment wants a lease with a timeout.

Dedupe is exact-match on normalized titles and URLs. It catches syndication, but two outlets writing different headlines about the same event both get through, and the prompt is instructed to cut the duplicate. Cheap embedding similarity would do this properly. And episode duration is estimated from word count rather than decoded from the audio, which is honest enough for a player but is still an estimate wearing a number's clothes.

The frontend has no automated tests. For a take-home of this size I put the test budget on the backend, where the load-bearing logic lives (the pipeline, the cost model, the one-call property, the API contract), and verified the two React pages by hand against the fake backend. A production version would add component tests around the generate-and-poll flow and the dashboard's real-versus-mock rendering.

## How I would extend this for a real customer

This is where the seams pay off. Multiple listeners: preferences become per-user rows and the pipeline already takes preferences as an argument, so fan-out is a loop before it needs to be a queue. When it does need one, the headless CLI boundary is exactly where a durable queue slots in, with cloud cron replacing the user's crontab. The news source protocol swaps RSS for a licensed API the moment there is an SLA conversation. SQLite and local files become Postgres and object storage along a path the code already isolates behind the store layer: the engine reads a `DATABASE_URL`, so moving the database is a connection string plus a psycopg driver and migrations, not a rewrite. I ran it on SQLite because that is the right size for one listener; the URL is the seam that makes Postgres a config change.

Observability is the part I would grow first, because the seed is planted: every stage of every generation already writes a timing-and-outcome event row. For a customer, that becomes alerting on failure rate and latency drift, and the cost dashboard stops being a courtesy and becomes the billing conversation, per-tenant spend against per-tenant caps, with enforcement.

None of that requires rearchitecting, which is the point. The demo is small because the problem is small. The shape is what scales.
