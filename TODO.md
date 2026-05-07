# RAG Agent System - Implementation TODO

## [x] 1. Project Structure & Deps
- [x] Root files complete
- [x] backend/config.py
- [ ] backend/ other core files (app.py, database.py, models.py, models_manager.py, workers.py)
- [ ] frontend/ (Vite+React) structure + package.json

## [ ] 2. Backend Core
- [ ] DB/Queue setup (Chroma multi-DB, Postgres work_data, Redis/Celery)
- [ ] Endpoints: /dbs, /upload, /query, /settings, /visualize
- [ ] Worker tasks (Celery: process file -> embed -> store)

## [ ] 3. Frontend UI
- [ ] App layout + tabs (DB, Upload, Query+Stats, Settings, Visualize)
- [ ] Components + API integration (axios)

## [ ] 4. Production Polish
- [ ] Logging, error handling, CORS, health
- [ ] Docker setup

## [ ] 5. Test & Demo
- [ ] Install/run (pip, npm, celery)
- [ ] Manual test: create DB, upload, query, viz, worker process
- [ ] attempt_completion

Updated: ✅ Plan confirmed + viz added
