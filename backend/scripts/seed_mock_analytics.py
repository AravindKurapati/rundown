"""Seed AnalyticsDaily with 90 days of clearly-flagged mock product metrics."""
import random
from datetime import date, timedelta
from app.store.db import init_db, get_session
from app.store.models import AnalyticsDaily


def main():
    init_db()
    with get_session() as s:
        start = date.today() - timedelta(days=89)
        for i in range(90):
            d = start + timedelta(days=i)
            s.add(AnalyticsDaily(
                day=d, is_mock=True,
                dau=random.randint(40, 120), wau=random.randint(200, 400), mau=random.randint(700, 1200),
                episodes=random.randint(30, 90),
                listen_through_rate=round(random.uniform(0.55, 0.82), 2),
                completion_rate=round(random.uniform(0.4, 0.7), 2),
                est_cost_usd=round(random.uniform(3, 9), 2),
            ))
        s.commit()
    print("seeded 90 mock days")


if __name__ == "__main__":
    main()
