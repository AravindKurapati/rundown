export interface Preferences {
  interests_json: string; tone: string; target_minutes: number; host_mode: string;
  voice_a: string; voice_b: string; tts_model: string;
  llm_model_script: string; schedule_cadence: string; schedule_time: string;
  timezone: string;
}
export interface Voice { id: string; name: string; description: string; }
export interface EpisodeSummary { id: number; title: string; status: string; created_at: string; duration_seconds: number | null; }
export interface Overview { episodes: number; success_rate: number; avg_latency_ms: number; tts_chars_total: number; est_cost_total_usd: number; budget_cap_usd: number; budget_used_pct: number; }
export interface Point { date: string; value: number; is_mock: boolean; }
export interface PipelineStage { stage: string; duration_ms: number; ok: boolean; }
export interface PipelineRun { run_at: string | null; stages: PipelineStage[]; }
export interface Estimate {
  minutes: number; est_chars: number; est_cost_usd: number;
  topics: string[]; voice_id: string; voice_name: string;
  spent_usd: number; budget_cap_usd: number; remaining_usd: number;
  would_exceed_budget: boolean; offline: boolean;
}
