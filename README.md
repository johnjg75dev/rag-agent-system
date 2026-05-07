# RAG-DB

Agentic Retrieval-Augmented Generation (RAG) system for document ingestion, vector search, and interactive query visualization.

This repository contains a complete working system under `rag-agent-system/` with:
- FastAPI backend and REST API
- Celery ingestion workers
- Postgres/pgvector database support
- Vector embedding and semantic search
- React + Vite frontend for upload, query, and visualization
- Docker compose orchestration for local development and production

## Project structure

- `rag-agent-system/` — main application folder
  - `backend/` — FastAPI API, database code, models, workers
  - `frontend/` — Vite + React UI
  - `docker-compose.yml` — local development services
  - `docker-compose.prod.yml` — production deployment services
  - `requirements.txt` — Python dependencies
  - `pyproject.toml` / `setup.py` — Python package metadata
  - `README.md` — project-specific documentation
  - `INSTALL.md` — installation notes
  - `MIGRATION.md` — migration guidance
  - `TODO.md` — outstanding tasks
  - `tests/` — Python unit tests

## Key features

- Multi-database vector store management
- Upload file ingestion and asynchronous worker processing
- Document chunking, embedding, and storage
- Query interface with nearest-neighbor retrieval
- Model configuration and runtime settings
- Vector visualization and search result exploration

## Prerequisites

- Python 3.10+
- Node.js 18+ / npm
- Docker and Docker Compose (for containerized setup)
- PostgreSQL + Redis if running outside Docker

## Local development

1. Copy environment variables

```powershell
cd rag-agent-system
copy .env.example .env
```

2. Start Docker services

```powershell
docker-compose up -d
```

3. Backend setup

```powershell
cd rag-agent-system
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

4. Apply database migrations

```powershell
cd rag-agent-system
alembic upgrade head
```

5. Start the frontend

```powershell
cd rag-agent-system\frontend
npm install
npm run dev
```

6. Start the API and workers

```powershell
cd rag-agent-system
.\.venv\Scripts\activate
uvicorn backend.app:app --reload --port 8001
```

In a separate terminal:

```powershell
cd rag-agent-system
.\.venv\Scripts\activate
celery -A backend.workers worker --loglevel=info -c 1
```

## Default URLs

- Frontend: `http://localhost:3000`
- API docs: `http://localhost:8001/docs`

## Production deployment

Use the production compose file and a process manager for worker/HTTP services.

```powershell
cd rag-agent-system
docker-compose -f docker-compose.prod.yml up -d
```

For production, ensure:
- PostgreSQL is configured with `pgvector`
- Redis is available for Celery
- model files and embeddings are accessible
- environment variables are set securely

## Running tests

```powershell
cd rag-agent-system
pytest
```

## Useful commands

- `docker-compose up -d` — start local services
- `docker-compose down` — stop services
- `npm run dev` — launch frontend in dev mode
- `uvicorn backend.app:app --reload --port 8001` — start API
- `celery -A backend.workers worker --loglevel=info -c 1` — start ingestion workers

## Contact

Built by Alphabit Labs.

For repository-specific details, refer to `rag-agent-system/README.md` and the subproject docs.
