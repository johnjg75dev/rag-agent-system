"""Celery worker tasks for document processing."""
from celery import Celery
from celery.signals import worker_process_init
from backend.config import settings
from backend.database import db_manager, SessionLocal, DocumentRecord
from backend.models_manager import model_manager
import uuid
from datetime import datetime

celery_app = Celery(
    "rag_worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    result_expires=3600,
)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=5)
def process_document(self, doc_id: str, filename: str, content: str, db_name: str, chunk_size: int = 500, chunk_overlap: int = 50):
    """Process document: chunk, embed, store in pgvector."""
    try:
        # Update status
        update_document_status(doc_id, "processing")

        # Simple text chunking (paragraphs then fixed size)
        chunks = chunk_text(content, chunk_size, chunk_overlap)
        embeddings = model_manager.embed(chunks)

        ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
        metadatas = [{"doc_id": doc_id, "filename": filename, "chunk_index": i} for i in range(len(chunks))]

        # Store in pgvector
        db_manager.add_to_collection(db_name, ids=ids, documents=chunks, metadatas=metadatas, embeddings=embeddings)

        update_document_status(doc_id, "completed")
        return {"status": "completed", "chunks": len(chunks), "doc_id": doc_id}
    except Exception as exc:
        update_document_status(doc_id, "failed", str(exc))
        self.retry(exc=exc)

# --- Helpers ---

def chunk_text(text: str, size: int, overlap: int) -> list:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        chunk = words[start:start + size]
        chunks.append(" ".join(chunk))
        start += max(1, size - overlap)
    return chunks

def update_document_status(doc_id: str, status: str, message: str = None):
    session = SessionLocal()
    try:
        doc = session.query(DocumentRecord).filter(DocumentRecord.id == doc_id).first()
        if doc:
            doc.status = status
            if message:
                meta = doc.metadata_json or {}
                meta["error"] = message
                doc.metadata_json = meta
            session.commit()
    finally:
        session.close()
