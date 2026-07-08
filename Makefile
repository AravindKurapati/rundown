.PHONY: setup dev test sample seed
setup:
	cd backend && pip install -e ".[dev]"
	cd frontend && npm install
test:
	cd backend && python -m pytest -q
dev:
	cd backend && uvicorn app.main:app --reload --port 8000 & \
	cd frontend && npm run dev
sample:
	cd backend && python -m scripts.make_sample
seed:
	cd backend && python -m scripts.seed_mock_analytics
