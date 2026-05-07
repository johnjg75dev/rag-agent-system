import os
import json
from dotenv import load_dotenv

_project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_dotenv = os.path.join(_project_root, ".env")
if os.path.isfile(_dotenv):
    load_dotenv(_dotenv)

_settings_file = os.path.join(
    os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(__file__), "..")),
    "settings.json",
)


class Settings:
    postgres_url: str = os.getenv("POSTGRES_URL", "postgresql://user:password@localhost:5432/ragdb")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    chroma_host: str = os.getenv("CHROMA_HOST", "localhost")
    chroma_port: int = int(os.getenv("CHROMA_PORT", "8855"))

    celery_broker_url: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    celery_result_backend: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
    celery_worker_concurrency: int = int(os.getenv("CELERY_WORKER_CONCURRENCY", "1"))

    default_text_embed_model: str = os.getenv(
        "TEXT_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
    )
    default_vision_embed_model: str = os.getenv("VISION_EMBED_MODEL", "")
    default_multimodal_embed_model: str = os.getenv("MULTIMODAL_EMBED_MODEL", "")
    default_query_llm_model: str = os.getenv("QUERY_LLM_MODEL", "")
    default_query_llm_base_url: str = os.getenv("QUERY_LLM_BASE_URL", "")
    default_query_llm_api_key: str = os.getenv("QUERY_LLM_API_KEY", "")
    default_rerank_model: str = os.getenv("RERANK_MODEL", "")

    origins: list = os.getenv("ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    secret_key: str = os.getenv("SECRET_KEY", "dev-secret-key")
    admin_username: str = os.getenv("ADMIN_USERNAME", "ragadmin")
    admin_password: str = os.getenv("ADMIN_PASSWORD", "ragpassword")

    chroma_path: str = os.getenv("CHROMA_PATH", "chroma_db")
    models_dir: str = os.getenv("MODELS_DIR", "./models")
    upload_dir: str = os.getenv("UPLOAD_DIR", "./uploads")

    default_chunk_size: int = int(os.getenv("DEFAULT_CHUNK_SIZE", "500"))
    default_chunk_overlap: int = int(os.getenv("DEFAULT_CHUNK_OVERLAP", "50"))
    default_top_k: int = int(os.getenv("DEFAULT_TOP_K", "5"))

    @staticmethod
    def _default_model_settings():
        from backend.models import (
            ModelSettings,
            EmbeddingModelConfig,
            QueryModelConfig,
            RerankModelConfig,
        )
        s = Settings
        return ModelSettings(
            text_embedding=EmbeddingModelConfig(
                model_name=s.default_text_embed_model,
                enabled=True,
                model_type="text",
            ),
            vision_embedding=EmbeddingModelConfig(
                model_name=s.default_vision_embed_model,
                enabled=bool(s.default_vision_embed_model),
                model_type="vision",
            ),
            multimodal_embedding=EmbeddingModelConfig(
                model_name=s.default_multimodal_embed_model,
                enabled=bool(s.default_multimodal_embed_model),
                model_type="multimodal",
            ),
            use_multimodal_for_both=False,
            embedding_prefix="search_document: ",
            query_llm=QueryModelConfig(
                model_name=s.default_query_llm_model,
                enabled=bool(s.default_query_llm_model),
                base_url=s.default_query_llm_base_url,
                api_key=s.default_query_llm_api_key,
            ),
            rerank=RerankModelConfig(
                model_name=s.default_rerank_model,
                enabled=bool(s.default_rerank_model),
            ),
        )

    @classmethod
    def load_persisted_settings(cls):
        if os.path.isfile(_settings_file):
            try:
                with open(_settings_file, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return {}

    @classmethod
    def save_persisted_settings(cls, data: dict):
        os.makedirs(os.path.dirname(_settings_file), exist_ok=True)
        with open(_settings_file, "w") as f:
            json.dump(data, f, indent=2)

    @classmethod
    def get_full_model_settings(cls) -> dict:
        persisted = cls.load_persisted_settings().get("model_settings", {})
        defaults = cls._default_model_settings().model_dump()
        if persisted:
            for key in defaults:
                if key in persisted:
                    if isinstance(defaults[key], dict) and isinstance(persisted[key], dict):
                        defaults[key].update(persisted[key])
                    else:
                        defaults[key] = persisted[key]
        return defaults

    @classmethod
    def get_effective_embed_model(cls) -> str:
        ms = cls.get_full_model_settings()
        if ms.get("use_multimodal_for_both") and ms.get("multimodal_embedding", {}).get("enabled"):
            return ms["multimodal_embedding"]["model_name"]
        return ms.get("text_embedding", {}).get("model_name", cls.default_text_embed_model)

    @classmethod
    def get_default_chunk_size(cls) -> int:
        persisted = cls.load_persisted_settings()
        return persisted.get("chunk_size", cls.default_chunk_size)

    @classmethod
    def get_default_chunk_overlap(cls) -> int:
        persisted = cls.load_persisted_settings()
        return persisted.get("chunk_overlap", cls.default_chunk_overlap)

    @classmethod
    def get_default_top_k(cls) -> int:
        persisted = cls.load_persisted_settings()
        return persisted.get("top_k", cls.default_top_k)

    @classmethod
    def get_current_db(cls) -> str:
        persisted = cls.load_persisted_settings()
        return persisted.get("current_db", "default")


settings = Settings()
