"""FastAPI application with all RAG endpoints."""
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
import uuid
import os

from backend.config import settings
from backend.models import (
    QueryRequest, DatabaseCreate, VisualizationRequest, SettingsUpdate,
    Document, SettingsResponse, ModelSettings, EmbeddingModelConfig,
    QueryModelConfig, RerankModelConfig,
)
from backend.database import get_db, db_manager, SessionLocal, DocumentRecord, VectorRecord
from backend.models_manager import model_manager

app = FastAPI(title="RAG Agent System API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _build_settings_response() -> dict:
    ms = settings.get_full_model_settings()
    return {
        "current_db": settings.get_current_db(),
        "databases": db_manager.list_databases(),
        "model_settings": ms,
        "chunk_size": settings.get_default_chunk_size(),
        "chunk_overlap": settings.get_default_chunk_overlap(),
        "top_k": settings.get_default_top_k(),
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/dbs")
def list_databases():
    try:
        dbs = db_manager.list_databases()
        return {"databases": dbs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/dbs")
def create_database(data: DatabaseCreate):
    try:
        result = db_manager.create_database(data.name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/dbs/{db_name}")
def delete_database(db_name: str):
    try:
        db_manager.delete_database(db_name)
        return {"status": "deleted", "db": db_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/upload")
def upload_document(
    file: UploadFile = File(...),
    db_name: str = Form("default"),
    chunk_size: int = Form(None),
    chunk_overlap: int = Form(None),
    db: Session = Depends(get_db_session),
):
    content = file.file.read().decode("utf-8")
    doc_id = str(uuid.uuid4())

    cs = chunk_size if chunk_size else settings.get_default_chunk_size()
    co = chunk_overlap if chunk_overlap else settings.get_default_chunk_overlap()

    record = DocumentRecord(
        id=doc_id,
        filename=file.filename,
        db_name=db_name,
        status="pending",
        metadata_json={"chunk_size": cs, "chunk_overlap": co},
    )
    db.add(record)
    db.commit()

    try:
        from backend.workers import process_document as celery_process_document
        celery_process_document.delay(doc_id, file.filename, content, db_name, cs, co)
    except Exception:
        try:
            from backend.workers import chunk_text
            chunks = chunk_text(content, cs, co)
            embeddings = model_manager.embed(chunks)
            ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
            metadatas = [
                {"doc_id": doc_id, "filename": file.filename, "chunk_index": i}
                for i in range(len(chunks))
            ]
            db_manager.add_to_collection(
                db_name, ids=ids, documents=chunks,
                metadatas=metadatas, embeddings=embeddings,
            )
            record = db.query(DocumentRecord).filter(DocumentRecord.id == doc_id).first()
            if record:
                record.status = "completed"
            db.commit()
        except Exception as proc_err:
            record = db.query(DocumentRecord).filter(DocumentRecord.id == doc_id).first()
            if record:
                record.status = "failed"
                meta = record.metadata_json or {}
                meta["error"] = str(proc_err)
                record.metadata_json = meta
            db.commit()
            raise HTTPException(status_code=500, detail=str(proc_err))

    return {"document_id": doc_id, "status": "pending", "filename": file.filename}


@app.get("/documents")
def list_documents(db_name: Optional[str] = None, db: Session = Depends(get_db_session)):
    q = db.query(DocumentRecord)
    if db_name:
        q = q.filter(DocumentRecord.db_name == db_name)
    records = q.order_by(DocumentRecord.created_at.desc()).all()
    return {
        "documents": [
            {
                "id": r.id,
                "filename": r.filename,
                "db_name": r.db_name,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "metadata": r.metadata_json,
            }
            for r in records
        ]
    }


@app.get("/documents/{doc_id}/status")
def get_document_status(doc_id: str, db: Session = Depends(get_db_session)):
    record = db.query(DocumentRecord).filter(DocumentRecord.id == doc_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "id": record.id,
        "filename": record.filename,
        "db_name": record.db_name,
        "status": record.status,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "metadata": record.metadata_json,
    }


@app.post("/query")
def query_documents(data: QueryRequest):
    try:
        query_embedding = model_manager.embed([data.query])[0]

        results = db_manager.query_collection(
            data.db_name,
            query_texts=[data.query],
            n_results=data.top_k or settings.get_default_top_k(),
            where=data.filters,
            query_embedding=query_embedding,
        )

        docs = results.get("documents", [[]])[0]
        distances = results.get("distances", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]

        formatted = []
        for i, dist in enumerate(distances):
            content = docs[i] if i < len(docs) else ""
            meta = metadatas[i] if i < len(metadatas) else {}
            formatted.append({
                "content": content,
                "meta": meta,
                "score": float(dist) if dist else 0.0,
            })

        if formatted:
            ms = settings.get_full_model_settings()
            if ms.get("rerank", {}).get("enabled"):
                try:
                    doc_texts = [r["content"] for r in formatted]
                    ranked_indices = model_manager.rerank(data.query, doc_texts, len(doc_texts))
                    formatted = [formatted[i] for i in ranked_indices]
                except Exception:
                    pass

        return {"results": formatted, "query": data.query, "db": data.db_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/settings")
def get_settings():
    return _build_settings_response()


@app.put("/settings")
def update_settings(data: SettingsUpdate):
    persisted = settings.load_persisted_settings()
    if data.current_db is not None:
        persisted["current_db"] = data.current_db
    if data.chunk_size is not None:
        persisted["chunk_size"] = data.chunk_size
    if data.chunk_overlap is not None:
        persisted["chunk_overlap"] = data.chunk_overlap
    if data.top_k is not None:
        persisted["top_k"] = data.top_k
    if data.model_settings is not None:
        persisted["model_settings"] = data.model_settings.model_dump()
    settings.save_persisted_settings(persisted)
    return {"message": "Settings updated", "settings": _build_settings_response()}


@app.get("/stats")
def get_stats():
    session = SessionLocal()
    try:
        total_docs = session.query(DocumentRecord).count()
        total_vectors = session.query(VectorRecord).count()
        dbs = session.query(VectorRecord.db_name).distinct().all()
        db_names = [r[0] for r in dbs if r[0]]

        status_counts = {"pending": 0, "processing": 0, "completed": 0, "failed": 0}
        docs_by_status = (
            session.query(DocumentRecord.status, func.count(DocumentRecord.id))
            .group_by(DocumentRecord.status)
            .all()
        )
        for status, count in docs_by_status:
            if status in status_counts:
                status_counts[status] = count

        return {
            "total_documents": total_docs,
            "total_vectors": total_vectors,
            "databases": db_names,
            "status_counts": status_counts,
        }
    finally:
        session.close()


@app.post("/visualize")
def visualize(data: VisualizationRequest):
    import numpy as np
    import umap
    from sklearn.decomposition import PCA
    from sklearn.manifold import TSNE

    session = SessionLocal()
    try:
        records = (
            session.query(VectorRecord)
            .filter(VectorRecord.db_name == data.db_name)
            .all()
        )
        if not records:
            return {
                "plot_data": [],
                "stats": {"total_points": 0, "method": data.method},
            }

        records_with_emb = [r for r in records if r.embedding is not None]
        if not records_with_emb:
            return {
                "plot_data": [],
                "stats": {"total_points": 0, "method": data.method},
            }

        embeddings = np.array([r.embedding for r in records_with_emb])

        if data.method == "umap":
            reducer = umap.UMAP(
                n_neighbors=min(data.n_neighbors, len(records_with_emb) - 1),
                min_dist=data.min_dist,
            )
            points = reducer.fit_transform(embeddings)
        elif data.method == "tsne":
            reducer = TSNE(
                n_components=2, perplexity=min(30, len(records_with_emb) - 1)
            )
            points = reducer.fit_transform(embeddings)
        else:
            reducer = PCA(n_components=2)
            points = reducer.fit_transform(embeddings)

        plot_data = [
            {
                "x": float(p[0]),
                "y": float(p[1]),
                "label": records_with_emb[i].content[:50] + "...",
            }
            for i, p in enumerate(points)
        ]
        return {
            "plot_data": plot_data,
            "stats": {
                "total_points": len(records_with_emb),
                "method": data.method,
                "dimensions": (
                    embeddings.shape[1] if len(embeddings) else 0
                ),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()


# ---------------------------------------------------------------------------
# Serve the built frontend (production)
# ---------------------------------------------------------------------------
_frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if _frontend_dist.is_dir():
    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=str(_frontend_dist / "assets")), name="static-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(request: Request, full_path: str):
        """SPA fallback — serve index.html for any unmatched route."""
        file = _frontend_dist / full_path
        if file.is_file():
            return FileResponse(str(file))
        return FileResponse(str(_frontend_dist / "index.html"))