.PHONY: setup dev test test-backend test-frontend sample seed
setup:
	cd backend && pip install -e ".[dev]"
	cd frontend && npm install
test: test-backend test-frontend
test-backend:
	cd backend && python -m pytest -q
test-frontend:
	cd frontend && npm test
dev:
	python dev.py
sample:
	cd backend && python -m scripts.make_sample
seed:
	cd backend && python -m scripts.seed_mock_analytics
