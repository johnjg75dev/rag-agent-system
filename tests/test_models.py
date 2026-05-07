import pytest
import os
import sys

# Ensure backend is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from models import QueryRequest, DatabaseCreate, VisualizationRequest, SettingsUpdate, Document, StatusEnum


class TestModels:
    def test_query_request_defaults(self):
        qr = QueryRequest(query="hello")
        assert qr.query == "hello"
        assert qr.db_name == "default"
        assert qr.top_k == 5
        assert qr.filters is None

    def test_query_request_custom(self):
        qr = QueryRequest(query="hello", db_name="mydb", top_k=10, filters={"x": 1})
        assert qr.top_k == 10
        assert qr.filters == {"x": 1}

    def test_document_model(self):
        doc = Document(filename="test.txt", content="hello world")
        assert doc.filename == "test.txt"
        assert doc.content == "hello world"
        assert doc.chunk_size == 500
        assert doc.chunk_overlap == 50
        assert doc.status == "pending"

    def test_database_create(self):
        d = DatabaseCreate(name="test_db")
        assert d.name == "test_db"
        assert d.description is None

    def test_visualization_request_defaults(self):
        v = VisualizationRequest(db_name="test_db")
        assert v.method == "umap"
        assert v.n_neighbors == 15
        assert v.min_dist == 0.1

    def test_settings_update(self):
        su = SettingsUpdate(current_db="main")
        assert su.current_db == "main"
        assert su.default_embed_model is None

    def test_status_enum_valid(self):
        assert StatusEnum.pending.value == "pending"
        assert StatusEnum.processing.value == "processing"
        assert StatusEnum.completed.value == "completed"
        assert StatusEnum.failed.value == "failed"
