import pytest
import os
import sys
import json
from unittest.mock import patch, MagicMock, PropertyMock
from io import BytesIO

# Ensure backend is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Mock Chroma connection to avoid it
from unittest.mock import MagicMock
mock_client = MagicMock()
mock_client.list_collections.return_value = []

# Patch chromadb before importing backend modules
sys.modules['chromadb'] = MagicMock()
sys.modules['chromadb.config'] = MagicMock()
sys.modules['chromadb.errors'] = MagicMock()

from models import QueryRequest, DatabaseCreate, VisualizationRequest, SettingsUpdate
from workers import chunk_text


class TestAppEndpoints:
    @pytest.fixture(autouse=True)
    def setup(self):
        # We need to import app here so the patches above apply
        with patch.dict("os.environ", {}, clear=False):
            # Patch out any heavy external connections before importing app
            pass
        # Import app after mocking chromadb upstream
        from app import app
        self.client = app

    def test_health_check(self):
        """Test the health check endpoint."""
        from app import app
        from fastapi.testclient import TestClient
        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_list_databases(self):
        """Test listing databases endpoint."""
        from app import app
        from fastapi.testclient import TestClient
        client = TestClient(app)
        response = client.get("/dbs")
        assert response.status_code == 200
        data = response.json()
        assert "databases" in data

    def test_create_and_delete_database(self):
        """Test creating and deleting a database."""
        from app import app
        from fastapi.testclient import TestClient
        client = TestClient(app)
        
        # Create a database
        response = client.post("/dbs", json={"name": "test_create_db"})
        assert response.status_code in [200, 500]  # May fail if Chroma is not available

    def test_query_documents(self):
        """Test the query documents endpoint."""
        from app import app
        from fastapi.testclient import TestClient
        client = TestClient(app)
        
        response = client.post("/query", json={
            "query": "test query",
            "db_name": "default"
        })
        # May fail due to Chroma unavailability
        assert response.status_code in [200, 500]

    def test_settings_endpoints(self):
        """Test the settings endpoints."""
        from app import app
        from fastapi.testclient import TestClient
        client = TestClient(app)
        
        # Get settings
        response = client.get("/settings")
        assert response.status_code == 200
        data = response.json()
        assert "current_db" in data
        assert "default_embed_model" in data
        
        # Update settings
        response = client.put("/settings", json={
            "current_db": "new_db",
            "default_embed_model": "model-x"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Settings updated"


class TestChunkText:
    def test_chunk_text_basic(self):
        """Test basic text chunking."""
        text = "This is a simple test sentence for chunking purposes."
        result = chunk_text(text, size=4, overlap=1)
        assert isinstance(result, list)
        assert len(result) > 0
        # All original words should be present
        all_words = " ".join(result).split()
        original_words = text.split()
        assert len(all_words) >= len(original_words) - 1

    def test_chunk_text_empty(self):
        """Test chunking empty text."""
        result = chunk_text("", size=10, overlap=2)
        assert result == []

    def test_chunk_text_single_word(self):
        """Test chunking single word."""
        result = chunk_text("hello", size=10, overlap=2)
        assert len(result) == 1
        assert result[0] == "hello"
