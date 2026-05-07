"""Database layer: SQLAlchemy models with pgvector for vector storage."""
from sqlalchemy import create_engine, Column, String, DateTime, JSON, Float, Integer, func, text
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from datetime import datetime
from typing import List, Dict, Any, Optional
from backend.config import settings
import os

# pgvector imports
from pgvector.sqlalchemy import Vector

Base = declarative_base()

# Enable pgvector extension
def init_pgvector(session: Session):
    """Initialize pgvector extension in PostgreSQL."""
    try:
        session.execute(text('CREATE EXTENSION IF NOT EXISTS vector'))
        session.commit()
    except Exception:
        session.rollback()

class DocumentRecord(Base):
    __tablename__ = "documents"
    id = Column(String, primary_key=True)
    filename = Column(String, nullable=False)
    db_name = Column(String, default="default", index=True)
    status = Column(String, default="pending")
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

class VectorRecord(Base):
    """Vector storage with pgvector native type."""
    __tablename__ = "vectors"
    id = Column(String, primary_key=True)
    doc_id = Column(String, nullable=False, index=True)
    db_name = Column(String, default="default", index=True)
    content = Column(String)
    # Native pgvector column for efficient similarity search
    # Using dynamic dimension based on model output
    embedding = Column(Vector)  # Flexible dimension
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.now)

# --- Database ---
def _init_engine():
    try:
        engine = create_engine(settings.postgres_url, connect_args={"connect_timeout": 5})
        # Verify connection and initialize pgvector
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("Using PostgreSQL with pgvector at", settings.postgres_url)
        return engine
    except Exception as e:
        print(f"PostgreSQL not available; falling back to SQLite (pgvector features disabled). Error: {e}")
        db_path = os.path.join(os.path.dirname(__file__), "rag_app.db")
        return create_engine(f"sqlite:///{db_path}")

engine = _init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Initialize pgvector extension
try:
    with SessionLocal() as session:
        init_pgvector(session)
except Exception as e:
    print(f"Could not initialize pgvector: {e}")

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Vector Database Manager (pgvector) ---
class VectorDBManager:
    """Manage vector databases using PostgreSQL/pgvector."""
    
    def __init__(self, session_factory):
        self.session_factory = session_factory
    
    def list_databases(self) -> List[str]:
        """List all vector databases (collections)."""
        session = self.session_factory()
        try:
            result = session.query(VectorRecord.db_name).distinct().all()
            return [row[0] for row in result if row[0]]
        except Exception:
            return []
        finally:
            session.close()
    
    def create_database(self, name: str):
        """Create a new vector database (collection)."""
        return {"name": name, "status": "created"}
    
    def delete_database(self, name: str):
        """Delete a vector database (collection)."""
        session = self.session_factory()
        try:
            session.query(VectorRecord).filter(VectorRecord.db_name == name).delete()
            session.commit()
        finally:
            session.close()
    
    def add_to_collection(self, db_name: str, ids: List[str], documents: List[str], 
                         metadatas: List[Dict[str, Any]], 
                         embeddings: Optional[List[List[float]]] = None):
        """Add vectors to a collection using native pgvector type."""
        session = self.session_factory()
        try:
            for i, id_ in enumerate(ids):
                embedding_vec = None
                if embeddings and i < len(embeddings):
                    embedding_vec = embeddings[i]
                
                record = VectorRecord(
                    id=id_,
                    doc_id=metadatas[i].get("doc_id", "") if i < len(metadatas) else "",
                    db_name=db_name,
                    content=documents[i] if i < len(documents) else "",
                    embedding=embedding_vec,
                    metadata_json=metadatas[i] if i < len(metadatas) else {}
                )
                session.merge(record)
            session.commit()
        finally:
            session.close()
    
    def query_collection(self, db_name: str, query_texts: List[str], 
                        n_results: int = 5, 
                        where: Optional[Dict[str, Any]] = None,
                        query_embedding: Optional[List[float]] = None):
        """
        Query vectors by similarity using pgvector's native operators.
        Returns results in ChromaDB-compatible format.
        
        Uses cosine distance for similarity search.
        """
        session = self.session_factory()
        try:
            # Build query with pgvector similarity
            query = session.query(VectorRecord).filter(VectorRecord.db_name == db_name)
            
            if query_embedding:
                # Use pgvector's native cosine_distance for efficient similarity search
                query = query.order_by(
                    VectorRecord.embedding.cosine_distance(query_embedding)
                ).limit(n_results)
            
            records = query.all()
            
            if not records:
                return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}
            
            # Format results
            results = []
            for record in records:
                distance = 0.0
                if query_embedding and record.embedding is not None:
                    # Calculate cosine distance if we have a query embedding
                    from sklearn.metrics.pairwise import cosine_similarity
                    import numpy as np
                    dist = cosine_similarity([query_embedding], [record.embedding])[0][0]
                    distance = float(1.0 - dist)
                
                results.append({
                    "id": record.id,
                    "document": record.content,
                    "metadata": record.metadata_json,
                    "distance": distance
                })
            
            return {
                "ids": [[r["id"] for r in results]],
                "documents": [[r["document"] for r in results]],
                "metadatas": [[r["metadata"] for r in results]],
                "distances": [[r["distance"] for r in results]]
            }
        finally:
            session.close()
    
    def list_documents_in_db(self, db_name: str) -> List[str]:
        """List all documents in a database."""
        session = self.session_factory()
        try:
            result = session.query(VectorRecord.doc_id).filter(
                VectorRecord.db_name == db_name
            ).distinct().all()
            return [row[0] for row in result if row[0]]
        finally:
            session.close()

# Global instance
db_manager = VectorDBManager(SessionLocal)
