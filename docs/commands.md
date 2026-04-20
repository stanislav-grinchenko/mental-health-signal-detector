# Project Command Reference

All commands run from the project root (`mental-health-signal-detector/`) unless noted.

---

## Poetry — dependency management

```bash
# Install all dependencies from poetry.lock
poetry install

# Add a runtime dependency
poetry add pandas

# Add a dev-only dependency
poetry add --group dev pytest-cov

# Remove a dependency
poetry remove pandas

# Update a specific package
poetry update pandas

# Regenerate poetry.lock after editing pyproject.toml manually
poetry lock

# Show installed packages
poetry show

# Open a shell with the virtualenv activated
poetry shell

# Run a command inside the virtualenv without activating it
poetry run python script.py
```

---

## Tests

```bash
# Run all tests (coverage is automatic — configured in pyproject.toml)
poetry run pytest

# Run a specific test folder
poetry run pytest tests/api -q
poetry run pytest tests/training -q
poetry run pytest tests/data_cleaning -q
poetry run pytest tests/dashboard -q

# Run a specific test file
poetry run pytest tests/api/test_main.py -v

# Run a single test by name
poetry run pytest tests/api/test_main.py::test_health_returns_healthy -v

# Run without coverage (faster)
poetry run pytest --no-cov

# Generate HTML coverage report and open it
poetry run pytest --cov=src --cov-report=html
open htmlcov/index.html

# Or via Makefile shortcuts
make test
make test-api
make test-training
make test-data-cleaning
make test-dashboard
```

---

## Pre-commit

```bash
# Install hooks into .git/hooks/ (one-time setup per clone)
pre-commit install

# Run all hooks against all files manually
pre-commit run --all-files

# Run a specific hook
pre-commit run ruff --all-files
pre-commit run ruff-format --all-files

# Update hook versions to latest
pre-commit autoupdate

# Temporarily skip hooks on a commit
SKIP=ruff git commit -m "wip"
```

---

## Ruff — linting & formatting

```bash
# Lint all Python files (excluding notebooks)
ruff check . --exclude "*.ipynb"

# Auto-fix lint issues
ruff check . --fix --exclude "*.ipynb"

# Check formatting (does not modify files)
ruff format --check . --exclude "*.ipynb"

# Apply formatting
ruff format . --exclude "*.ipynb"
```

---

## FastAPI — local dev server

```bash
# Start the API locally (hot reload on file changes)
poetry run uvicorn src.api.main:app --reload --port 8000

# Access interactive API docs
open http://localhost:8000/docs

# Check health endpoint
curl http://localhost:8000/health

# Test predict endpoint
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "I feel hopeless and cannot sleep."}'
```

---

## Streamlit — local dashboard

```bash
# Start the dashboard
poetry run streamlit run src/dashboard/app.py

# Opens automatically at http://localhost:8501
```

---

## Docker

```bash
# Build the API image locally (native arch — for local testing only, do NOT push)
docker build -f docker/Dockerfile.api -t mental-health-api:local .

# Build with a specific model version
docker build -f docker/Dockerfile.api \
  --build-arg MODEL_VERSION=mental_roberta_v2 \
  -t mental-health-api:local .

# Run the API container locally
docker run -p 8000:8000 \
  --env-file .env \
  mental-health-api:local

# Run with Docker Compose (from project root)
docker compose -f docker/docker-compose.yml up --build

# Stop and remove containers
docker compose -f docker/docker-compose.yml down

# Build for linux/amd64 (Cloud Run) and push (requires buildx + gcloud auth)
make docker-deploy
```

---

## gcloud — Google Cloud

```bash
# Authenticate
gcloud auth login
gcloud auth application-default login

# Configure Docker to push to Artifact Registry
gcloud auth configure-docker europe-west1-docker.pkg.dev

# Set active project
gcloud config set project mental-health-signal-detector

# === Deployment ===

# Option A: Deploy via Cloud Build (builds on GCP — no local Docker needed, recommended)
gcloud builds submit --config cloudbuild.yaml .

# Option B: Deploy with a specific model version
gcloud builds submit --config cloudbuild.yaml \
  --substitutions _MODEL_VERSION=mental_roberta_v2 .

# Option C: Build locally (linux/amd64) and deploy (requires Apple Silicon buildx setup)
make docker-deploy

# Or via Makefile shortcut for Option A
make cloud-deploy

# === Cloud Run ===

# View running services
gcloud run services list --region europe-west1

# Describe a service (shows URL, env vars, last revision)
gcloud run services describe mental-health-api --region europe-west1

# View recent logs
gcloud run services logs read mental-health-api --region europe-west1 --limit 50

# Stream live logs
gcloud beta run services logs tail mental-health-api --region europe-west1

# Rollback to a previous model version
gcloud run deploy mental-health-api \
  --image europe-west1-docker.pkg.dev/mental-health-signal-detector/mental-health-api/api:mental_roberta_v1 \
  --region europe-west1

# Set or update an environment variable
gcloud run services update mental-health-api \
  --region europe-west1 \
  --set-env-vars DATABASE_URL=postgresql://...

# === Artifact Registry ===

# List all images
gcloud artifacts docker images list \
  europe-west1-docker.pkg.dev/mental-health-signal-detector/mental-health-api/api

# Delete an old image version
gcloud artifacts docker images delete \
  europe-west1-docker.pkg.dev/mental-health-signal-detector/mental-health-api/api:old_version
```

---

## Git

```bash
# Standard feature branch workflow
git checkout -b Stan
git add src/api/main.py
git commit -m "feat: add drift endpoint"
git push origin Stan

# Create a PR to main via GitHub CLI
gh pr create --base main --title "Add drift endpoint"

# Check CI status on current branch
gh run list --branch Stan
gh run watch  # stream the latest run live
```

---

## Quick reference — most used daily

| Task | Command |
|------|---------|
| Run all tests | `poetry run pytest` |
| Run API tests only | `make test-api` |
| Start API locally | `poetry run uvicorn src.api.main:app --reload` |
| Start dashboard locally | `poetry run streamlit run src/dashboard/app.py` |
| Lint + format check | `ruff check . && ruff format --check .` |
| Fix lint issues | `ruff check . --fix && ruff format .` |
| Run pre-commit on all files | `pre-commit run --all-files` |
| Deploy to Cloud Run | `make cloud-deploy` |
| View Cloud Run logs | `gcloud run services logs read mental-health-api --region europe-west1` |
