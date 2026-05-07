import pytest
import os
import sys
from unittest.mock import patch, MagicMock

# Ensure backend is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from models_manager import ModelManager
import numpy as np


class TestModelManager:
    def test_model_manager_singleton(self):
        """Test that the global model_manager is a ModelManager instance."""
        from models_manager import model_manager
        assert isinstance(model_manager, ModelManager)

    @patch("models_manager.SentenceTransformer")
    def test_get_model(self, mock_transformer):
        """Test that get_model returns a cached model."""
        from models_manager import model_manager
        # Reset cache for test
        model_manager._cache = {}
        
        mock_instance = MagicMock()
        mock_transformer.return_value = mock_instance
        
        # First call should initialize the model
        result1 = model_manager.get_model("all-MiniLM-L6-v2")
        assert result1 is not None
        mock_transformer.assert_called_once()
        
        # Second call should return from cache
        result2 = model_manager.get_model("all-MiniLM-L6-v2")
        assert result1 is result2  # Same cached object

    @patch("models_manager.SentenceTransformer")
    def test_list_models(self, mock_transformer):
        """Test listing cached models."""
        from models_manager import model_manager
        # Reset cache
        model_manager._cache = {}
        
        mock_instance = MagicMock()
        mock_transformer.return_value = mock_instance
        
        # Initially empty
        assert model_manager.list_models() == []
        
        # After loading a model
        model_manager.get_model("model-a")
        assert "model-a" in model_manager.list_models()

    @patch("models_manager.SentenceTransformer")
    def test_embed(self, mock_transformer):
        """Test the embed method."""
        from models_manager import model_manager
        # Reset cache
        model_manager._cache = {}
        
        mock_result = np.array([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]])
        mock_model = MagicMock()
        mock_model.encode.return_value = mock_result
        mock_transformer.return_value = mock_model
        
        result = model_manager.embed(["hello", "world"])
        assert isinstance(result, list)
        assert len(result) == 2
        mock_model.encode.assert_called_once_with(["hello", "world"], show_progress_bar=False)
