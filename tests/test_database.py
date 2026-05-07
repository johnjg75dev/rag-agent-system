import pytest
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from database import VectorDBManager, VectorRecord, DocumentRecord
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


class TestVectorDBManager:
    def setup_method(self):
        """Set up an in-memory SQLite database for testing."""
        from database import Base
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.manager = VectorDBManager(self.Session)

    def test_list_databases_empty(self):
        """Test listing databases when empty."""
        result = self.manager.list_databases()
        assert result == []

    def test_create_database(self):
        """Test creating a database."""
        result = self.manager.create_database("test_db")
        assert result["name"] == "test_db"
        assert result["status"] == "created"

    def test_add_to_collection(self):
        """Test adding vectors to collection."""
        ids = ["id1", "id2"]
        documents = ["doc1", "doc2"]
        metadatas = [{"key": "value1"}, {"key": "value2"}]
        embeddings = [[0.1, 0.2], [0.3, 0.4]]
        
        self.manager.add_to_collection("test_db", ids, documents, metadatas, embeddings)
        
        session = self.Session()
        count = session.query(VectorRecord).filter(VectorRecord.db_name == "test_db").count()
        session.close()
        assert count == 2

    def test_list_databases(self):
        """Test listing databases after adding data."""
        # Add to db1
        self.manager.add_to_collection("db1_test", ["id1"], ["doc1"], [{}], [[0.1, 0.2]])
        # Add to db2
        self.manager.add_to_collection("db2_test", ["id2"], ["doc2"], [{}], [[0.3, 0.4]])
        
        result = self.manager.list_databases()
        assert "db1_test" in result
        assert "db2_test" in result

    def test_delete_database(self):
        """Test deleting a database."""
        ids = ["id1"]
        documents = ["doc1"]
        metadatas = [{}]
        embeddings = [[0.1, 0.2]]
        
        self.manager.add_to_collection("to_delete", ids, documents, metadatas, embeddings)
        self.manager.delete_database("to_delete")
        
        result = self.manager.list_databases()
        assert "to_delete" not in result

    def test_list_documents_in_db(self):
        """Test listing documents in a database."""
        ids = ["doc1_0", "doc1_1", "doc2_0"]
        documents = ["doc1 chunk1", "doc1 chunk2", "doc2 chunk1"]
        metadatas = [{"doc_id": "doc1"}, {"doc_id": "doc1"}, {"doc_id": "doc2"}]
        embeddings = [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]]
        
        self.manager.add_to_collection("test_db", ids, documents, metadatas, embeddings)
        
        result = self.manager.list_documents_in_db("test_db")
        assert "doc1" in result
        assert "doc2" in result
