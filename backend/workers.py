"""Celery worker tasks for document processing."""
from celery import Celery
from celery.signals import worker_process_init
from backend.config import settings
from backend.database import db_manager, SessionLocal, DocumentRecord
from backend.models_manager import model_manager
import uuid
import base64
import io
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
    task_soft_time_limit=600,
    task_time_limit=900,
)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=5)
def process_document(self, doc_id: str, filename: str, content: str, db_name: str, chunk_size: int = 500, chunk_overlap: int = 50):
    """Process text document: chunk, embed, store in pgvector."""
    try:
        update_document_status(doc_id, "processing")

        chunks = chunk_text(content, chunk_size, chunk_overlap)
        embeddings = model_manager.embed(chunks)

        ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
        metadatas = [{"doc_id": doc_id, "filename": filename, "chunk_index": i} for i in range(len(chunks))]

        db_manager.add_to_collection(db_name, ids=ids, documents=chunks, metadatas=metadatas, embeddings=embeddings)

        update_document_status(doc_id, "completed")
        return {"status": "completed", "chunks": len(chunks), "doc_id": doc_id}
    except Exception as exc:
        update_document_status(doc_id, "failed", str(exc))
        self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=10)
def process_image_document(self, doc_id: str, filename: str, file_bytes: bytes, db_name: str):
    """Process image document using vision model if available."""
    try:
        update_document_status(doc_id, "processing")

        ms = settings.get_full_model_settings()
        vision_config = ms.get("vision_embedding", {})
        multimodal_config = ms.get("multimodal_embedding", {})

        use_multimodal = ms.get("use_multimodal_for_both") and multimodal_config.get("enabled")
        use_vision = vision_config.get("enabled")

        if not use_vision and not use_multimodal:
            raise ValueError("No vision or multimodal model configured. Enable one in Settings.")

        model_name = multimodal_config["model_name"] if use_multimodal else vision_config["model_name"]

        # Convert bytes to PIL image
        from PIL import Image
        img = Image.open(io.BytesIO(file_bytes))

        # Embed the image using sentence-transformers
        try:
            embedding = model_manager.embed_vision([img])
        except Exception:
            # Fallback: try to encode as pixel data embedding
            img_resized = img.resize((224, 224)).convert("RGB")
            import numpy as np
            pixel_array = np.array(img_resized, dtype=np.float32) / 255.0
            from backend.models_manager import model_manager as mm
            # Use the configured model for embedding
            pixel_features = mm._get_embed_model(model_name).encode([img])[0]
            embedding = [pixel_features.tolist()]

        if embedding and len(embedding) > 0:
            chunk_id = f"{doc_id}_img_0"
            db_manager.add_to_collection(
                db_name,
                ids=[chunk_id],
                documents=[f"[Image: {filename}]"],
                metadatas=[{"doc_id": doc_id, "filename": filename, "is_image": True, "width": img.width, "height": img.height}],
                embeddings=embedding,
            )

        update_document_status(doc_id, "completed")
        return {"status": "completed", "doc_id": doc_id, "type": "image"}
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