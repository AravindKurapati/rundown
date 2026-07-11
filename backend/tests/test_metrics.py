from app.store import db as dbmod, repo
from app.store import metrics
from app.store.metrics import episode_cost


def test_cost_uses_configurable_rates():
    # 6000 chars at 0.10/1k = 0.60 tts; tokens negligible
    c = episode_cost(tts_chars=6000, tokens_in=1000, tokens_out=1000)
    assert round(c, 2) >= 0.60


def test_budget_would_exceed_sums_ready_spend_against_cap(tmp_path, monkeypatch):
    # Two ready episodes have spent 12.00. A run landing exactly on the cap is
    # allowed (strict > semantics); a run one cent over is refused.
    monkeypatch.setattr(dbmod, "engine", dbmod.make_engine(tmp_path / "t.db"))
    dbmod.init_db()
    repo.create_episode(status="ready", est_cost_usd=5.0)
    repo.create_episode(status="ready", est_cost_usd=7.0)
    monkeypatch.setattr("app.config.settings.budget_cap_usd", 12.0)

    assert metrics.total_spent_usd() == 12.0
    assert metrics.budget_would_exceed(0.0) is False
    assert metrics.budget_would_exceed(0.01) is True
