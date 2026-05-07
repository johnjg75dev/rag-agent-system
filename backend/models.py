from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import enum

class StatusEnum(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"

class Document(BaseModel):
    id: Optional[str] = None
    filename: str
    content: str
    chunk_size: int = 500
    chunk_overlap: int = 50
    metadata: Optional[Dict[str, Any]] = None
    db_name: str = "default"
    status: str = "pending"
    created_at: Optional[datetime] = None

class QueryRequest(BaseModel):
    query: str
    db_name: str = "default"
    top_k: int = 5
    filters: Optional[Dict[str, Any]] = None

class QueryResult(BaseModel):
    content: str
    metadata: Dict[str, Any]
    score: float

class ProcessingStatus(BaseModel):
    document_id: str
    status: StatusEnum
    message: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class DatabaseCreate(BaseModel):
    name: str
    description: Optional[str] = None

class VisualizationRequest(BaseModel):
    db_name: str = "default"
    method: str = "umap"
    n_neighbors: int = 15
    min_dist: float = 0.1

class VisualizationResponse(BaseModel):
    plot_data: List[Dict[str, Any]]
    stats: Dict[str, Any]

class EmbeddingModelConfig(BaseModel):
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    enabled: bool = True
    model_type: str = "text"

class RerankModelConfig(BaseModel):
    model_name: str = ""
    enabled: bool = False

class QueryModelConfig(BaseModel):
    model_name: str = ""
    enabled: bool = False
    base_url: str = ""
    api_key: str = ""

class ModelSettings(BaseModel):
    text_embedding: EmbeddingModelConfig = Field(default_factory=EmbeddingModelConfig)
    vision_embedding: EmbeddingModelConfig = Field(default_factory=lambda: EmbeddingModelConfig(model_name="", enabled=False, model_type="vision"))
    multimodal_embedding: EmbeddingModelConfig = Field(default_factory=lambda: EmbeddingModelConfig(model_name="", enabled=False, model_type="multimodal"))
    use_multimodal_for_both: bool = False
    embedding_prefix: str = "search_document: "
    query_llm: QueryModelConfig = Field(default_factory=QueryModelConfig)
    rerank: RerankModelConfig = Field(default_factory=RerankModelConfig)

class SettingsUpdate(BaseModel):
    current_db: Optional[str] = None
    model_settings: Optional[ModelSettings] = None
    chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None
    top_k: Optional[int] = None

class SettingsResponse(BaseModel):
    current_db: str = "default"
    databases: List[str] = []
    model_settings: ModelSettings = Field(default_factory=ModelSettings)
    chunk_size: int = 500
    chunk_overlap: int = 50
    top_k: int = 5
