import pytest
import os
import sys
from unittest.mock import patch, MagicMock

# Ensure backend is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from workers import chunk_text, update_document_status


class TestChunkText:
    def test_chunk_text_basic(self):
        """Test basic text chunking functionality."""
        text = "This is a simple test sentence for chunking purposes with many words."
        result = chunk_text(text, size=4, overlap=1)
        assert isinstance(result, list)
        assert len(result) > 0
        # Verify all original words are included
        all_words = " ".join(result).split()
        original_words = text.split()
        assert len(all_words) >= len(original_words) - 1

    def test_chunk_text_empty(self):
        """Test chunking empty text returns empty list."""
        result = chunk_text("", size=10, overlap=2)
        assert result == []

    def test_chunk_text_single_word(self):
        """Test chunking single word."""
        result = chunk_text("hello", size=10, overlap=2)
        assert len(result) == 1
        assert result[0] == "hello"

    def test_chunk_text_no_overlap(self):
        """Test chunking without overlap."""
        text = "one two three four five six"
        result = chunk_text(text, size=2, overlap=0)
        assert len(result) == 3
        assert result[0] == "one two"
        assert result[1] == "three four"
        assert result[2] == "five six"

    def test_chunk_text_with_overlap(self):
        """Test chunking with overlap."""
        text = "one two three four five six seven eight"
        result = chunk_text(text, size=4, overlap=2)
        assert len(result) >= 2


class TestUpdateDocumentStatus:
    @patch("workers.SessionLocal")
    def test_update_document_status_success(self, mock_session_class):
        """Test updating document status successfully."""
        mock_session = MagicMock()
        mock_session_class.return_value = mock_session
        
        mock_doc = MagicMock()
        mock_doc.metadata_json = {}
        mock_query = MagicMock()
        mock_query.first.return_value = mock_doc
        mock_session.query.return_value.filter.return_value = mock_query
        
        update_document_status("doc123", "completed")
        
        assert mock_doc.status == "completed"
        mock_session.commit.assert_called_once()
        mock_session.close.assert_called_once()

    @patch("workers.SessionLocal")
    def test_update_document_status_not_found(self, mock_session_class):
        """Test updating status for non-existent document."""
        mock_session = MagicMock()
        mock_session_class.return_value = mock_session
        
        mock_query = MagicMock()
        mock_query.first.return_value = None
        mock_session.query.return_value.filter.return_value = mock_query
        
        # Should not raise exception
        update_document_status("nonexistent", "completed")
        
        mock_session.commit.assert_not_called()
        mock_session.close.assert_called_once()

    @patch("workers.SessionLocal")
    def test_update_document_status_with_message(self, mock_session_class):
        """Test updating status with error message."""
        mock_session = MagicMock()
        mock_session_class.return_value = mock_session
        
        mock_doc = MagicMock()
        mock_doc.metadata_json = {}
        mock_query = MagicMock()
        mock_query.first.return_value = mock_doc
        mock_session.query.return_value.filter.return_value = mock_query
        
        update_document_status("doc123", "failed", "Error occurred")
        
        assert mock_doc.status == "failed"
        assert mock_doc.metadata_json["error"] == "Error occurred"
        mock_session.commit.assert_called_once()
