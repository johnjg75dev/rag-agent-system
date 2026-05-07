import pytest
import os
import sys
from unittest.mock import patch

# Ensure backend is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))


class TestConfig:
    @pytest.fixture(autouse=True)
    def setup(self):
        """Clear environment before each test."""
        for key in ['POSTGRES_URL', 'REDIS_URL', 'CHROMA_HOST', 'CHROMA_PORT', 
                    'CELERY_BROKER_URL', 'CELERY_RESULT_BACKEND', 'CELERY_WORKER_CONCURRENCY',
                    'DEFAULT_EMBED_MODEL', 'ORIGINS', 'SECRET_KEY', 'CHROMA_PATH', 
                    'MODELS_DIR', 'UPLOAD_DIR']:
            os.environ.pop(key, None)
        yield
    
    def test_settings_instance_exists(self):
        """Test that the global settings instance exists."""
        from config import settings
        assert settings is not None

    def test_default_values(self):
        """Test that default values are set correctly when no env vars are provided."""
        from config import Settings
        s = Settings()
        assert s.postgres_url == "postgresql://user:password@localhost:5432/ragdb"
        assert s.redis_url == "redis://localhost:6379/0"
        assert s.chroma_host == "localhost"
        assert s.chroma_port == 8000
        assert s.celery_broker_url == "redis://localhost:6379/0"
        assert s.celery_result_backend == "redis://localhost:6379/0"
        assert s.celery_worker_concurrency == 1
        assert s.default_embed_model == "sentence-transformers/all-MiniLM-L6-v2"
        assert s.origins == ["http://localhost:3000", "http://127.0.0.1:3000"]
        assert s.secret_key == "dev-secret-key"
        assert s.chroma_path == "chroma_db"
        assert s.models_dir == "./models"
        assert s.upload_dir == "./uploads"

    def test_origins_parsing(self):
        """Test that ORIGINS env var is correctly split into list."""
        from config import Settings
        original = os.environ.get("ORIGINS")
        try:
            os.environ["ORIGINS"] = "http://a.com,http://b.com"
            # Need to reload the module to pick up new env var
            import importlib
            import config
            importlib.reload(config)
            s = config.Settings()
            assert s.origins == ["http://a.com", "http://b.com"]
        finally:
            if original is None:
                os.environ.pop("ORIGINS", None)
            else:
                os.environ["ORIGINS"] = original

    def test_settings_singleton(self):
        """Test that the singleton instance is properly created."""
        from config import settings as s1
        from config import settings as s2
        assert s1 is s2
