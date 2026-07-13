# Database Schema

## preferences

Singleton table storing application settings (id=1, created on init).

| Column | Type | Default | Note |
|--------|------|---------|------|
| id | int | 1 | Primary key |
| interests_json | str | '["AI", "startups", "markets"]' | User interests as JSON array |
| tone | str | "sharp, warm, lightly witty" | Narration tone style |
| target_minutes | int | 5 | Target episode length in minutes |
| host_mode | str | "single" | Hosting mode; "single" ships, "two" is a documented stretch |
| voice_a | str | "21m00Tcm4TlvDq8ikWAM" | Primary ElevenLabs voice ID (premade "Rachel") |
| voice_b | str | "ErXwobaYiN019PkySvjV" | Secondary ElevenLabs voice ID (premade "Antoni") |
| tts_model | str | "eleven_multilingual_v2" | TTS model identifier |
| llm_model_script | str | "gpt-5.5" | Model for script generation |
| schedule_cadence | str | "daily" | Generation schedule; validated to daily or weekly |
| schedule_time | str | "07:00" | Scheduled generation time (HH:MM, validated) |
| timezone | str | "America/New_York" | User timezone (validated IANA name) |
| budget_cap_usd | float | 20.0 | Total committed-spend cap in USD (sum of ready-episode cost; not a per-period reset) |
| updated_at | datetime | now(UTC) | Last update timestamp (tz-aware UTC) |

## episodes

Podcast episodes with generation metadata and status.

| Column | Type | Default | Note |
|--------|------|---------|------|
| id | int | NULL | Primary key (auto-increment) |
| title | str | "" | Episode title |
| status | str | "pending" | One of: pending, generating, ready, failed |
| created_at | datetime | now(UTC) | Creation timestamp (tz-aware UTC) |
| completed_at | datetime | NULL | Completion timestamp |
| mp3_path | str | NULL | Path to generated MP3 file |
| transcript_json | str | NULL | Episode transcript as JSON |
| duration_seconds | int | NULL | Audio duration in seconds |
| word_count | int | NULL | Transcript word count |
| tts_characters | int | NULL | Characters processed by TTS |
| openai_tokens | int | NULL | Tokens used for LLM calls |
| est_cost_usd | float | NULL | Estimated cost in USD |
| latency_ms | int | NULL | End-to-end generation latency |
| host_mode | str | "single" | Hosting mode used for this episode (single ships) |
| source_count | int | NULL | Number of sources processed |
| topics_json | str | NULL | Topics covered as JSON array |
| error | str | NULL | Error message if generation failed |

## generation_events

Stage-level events during episode generation for debugging and monitoring.

| Column | Type | Default | Note |
|--------|------|---------|------|
| id | int | NULL | Primary key (auto-increment) |
| episode_id | int | Required | Foreign key to episodes.id |
| stage | str | Required | Pipeline stage name |
| started_at | datetime | now(UTC) | Stage start timestamp (tz-aware UTC) |
| ended_at | datetime | NULL | Stage completion timestamp |
| duration_ms | int | NULL | Stage duration in milliseconds |
| ok | bool | True | Success flag |
| detail | str | NULL | Optional stage-specific detail or error |

## analytics_daily

Daily aggregated metrics for monitoring user engagement.

| Column | Type | Default | Note |
|--------|------|---------|------|
| id | int | NULL | Primary key (auto-increment) |
| day | date | Required | Date for this record |
| is_mock | bool | True | Whether metrics are mocked/synthetic |
| dau | int | 0 | Daily active users |
| wau | int | 0 | Weekly active users |
| mau | int | 0 | Monthly active users |
| episodes | int | 0 | Episodes generated on this day |
| listen_through_rate | float | 0.0 | Fraction of episodes listened to completion |
| completion_rate | float | 0.0 | Fraction of generation jobs completed |
| est_cost_usd | float | 0.0 | Estimated total cost for the day |
