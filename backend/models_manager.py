"""Model manager with support for text, vision, multimodal embedding and reranking."""
from sentence_transformers import SentenceTransformer, CrossEncoder
from backend.config import settings
import os


class ModelManager:
    def __init__(self):
        self.models_dir = settings.models_dir
        os.makedirs(self.models_dir, exist_ok=True)
        self._embed_cache = {}
        self._rerank_cache = None
        self._rerank_name = None

    def _get_embed_model(self, model_name: str):
        if model_name not in self._embed_cache:
            self._embed_cache[model_name] = SentenceTransformer(
                model_name, cache_folder=self.models_dir
            )
        return self._embed_cache[model_name]

    def embed(self, texts: list, model_name: str = None) -> list:
        name = model_name or settings.get_effective_embed_model()
        model = self._get_embed_model(name)
        return model.encode(texts, show_progress_bar=False).tolist()

    def embed_text(self, texts: list) -> list:
        ms = settings.get_full_model_settings()
        model_name = ms.get("text_embedding", {}).get("model_name", "") or settings.default_text_embed_model
        return self.embed(texts, model_name=model_name)

    def embed_vision(self, images: list) -> list:
        ms = settings.get_full_model_settings()
        if ms.get("use_multimodal_for_both") and ms.get("multimodal_embedding", {}).get("enabled"):
            model_name = ms["multimodal_embedding"]["model_name"]
        else:
            model_name = ms.get("vision_embedding", {}).get("model_name", "")
            if not model_name:
                raise ValueError("No vision embedding model configured")
        return self.embed(images, model_name=model_name)

    def rerank(self, query: str, documents: list, top_k: int = None):
        ms = settings.get_full_model_settings()
        rerank_cfg = ms.get("rerank", {})
        model_name = rerank_cfg.get("model_name", "")
        if not model_name or not rerank_cfg.get("enabled"):
            return list(range(len(documents)))

        if self._rerank_name != model_name:
            self._rerank_cache = CrossEncoder(model_name, cache_folder=self.models_dir)
            self._rerank_name = model_name

        import torch
        pairs = [[query, doc] for doc in documents]
        scores = self._rerank_cache.predict(pairs)
        if hasattr(scores, "tolist"):
            scores = scores.tolist()

        top_k = top_k or len(documents)
        ranked = sorted(
            range(len(scores)), key=lambda i: scores[i], reverse=True
        )[:top_k]
        return ranked

    def list_loaded_models(self) -> list:
        return {
            "embed_models": list(self._embed_cache.keys()),
            "rerank_model": self._rerank_name if self._rerank_cache else None,
        }


model_manager = ModelManager()
