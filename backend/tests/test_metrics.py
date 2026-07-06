from app.store.metrics import episode_cost


def test_cost_uses_configurable_rates():
    # 6000 chars at 0.10/1k = 0.60 tts; tokens negligible
    c = episode_cost(tts_chars=6000, tokens_in=1000, tokens_out=1000)
    assert round(c, 2) >= 0.60
