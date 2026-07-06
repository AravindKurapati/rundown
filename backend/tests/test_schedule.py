from datetime import datetime
from zoneinfo import ZoneInfo
from app.store.metrics import next_run


def test_next_run_daily_future_same_day():
    now = datetime(2026, 7, 5, 6, 0, tzinfo=ZoneInfo("America/New_York"))
    nxt = next_run("daily", "07:00", "America/New_York", now=now)
    assert nxt.hour == 7 and nxt.day == 5


def test_next_run_rolls_to_tomorrow():
    now = datetime(2026, 7, 5, 8, 0, tzinfo=ZoneInfo("America/New_York"))
    nxt = next_run("daily", "07:00", "America/New_York", now=now)
    assert nxt.day == 6
