# Agentic AI RAG System

Production-ready RAG system with ChromaDB vectors, file upload/processing workers, query UI, model management, and vector visualization.

## Quick Start (Development)

1. Copy `.env.example` to `.env` and edit:
   
```
   cp .env.example .env
   
```

2. Start services (Docker):
   
```
   docker-compose up -d
   
```

3. Backend setup:
   
```
   cd backend
   python -m venv venv
   venv\Scripts\activate
   pip install -r ..\requirements.txt
   alembic upgrade head  # DB migrations
   
```

4. Frontend:
   
```
   cd frontend
   npm install
   npm run dev
   
```

5. Start API + Workers:
   
```
   cd ..\backend
   start uvicorn app:app --reload --port 8001
   celery -A workers worker --loglevel=info -c 1
   
```

- Frontend: http://localhost:3000
- API Docs: http://localhost:8001/docs
- DBs: Select/create in UI, upload files, query/visualize.

## Features
- Multi-DB Chroma management
- File upload -> worker queue (Postgres) -> embed/store
- Query + stats
- Model settings (HF/local)
- Vector viz (scatter, neighbors)

## Production
Use Docker, Gunicorn+Uvicorn, PM2/Supervisor for workers/frontend.

Windows-compatible (tested Win11).
