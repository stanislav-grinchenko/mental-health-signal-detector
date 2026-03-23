import io
import pickle

import joblib
import torch

import src.common.config as config
import src.training.predict as predictor

_lr_model = joblib.load(config.LR_MODEL_PATH)
_lr_vectorizer = joblib.load(config.VECTORIZER_PATH)
_distilbert_model = None  # Lazy load the DistilBERT model when needed
_xgboost_model = None
_xgboost_vectorizer = None


class CPUUnpickler(pickle.Unpickler):
    """Custom unpickler to load PyTorch models on CPU."""

    def find_class(self, module, name):
        """Override the find_class method to handle loading PyTorch models on CPU."""
        if module == "torch.storage" and name == "_load_from_bytes":
            return lambda b: torch.load(io.BytesIO(b), map_location="cpu", weights_only=False)
        return super().find_class(module, name)


def _get_distilbert_model():
    """Load the DistilBERT model from disk if it hasn't been loaded yet, and return it."""
    global _distilbert_model
    if _distilbert_model is None:
        with open(config.DISTILBERT_MODEL_PATH, "rb") as f:
            _distilbert_model = CPUUnpickler(f).load()
    return _distilbert_model


def _get_xgboost_artifacts():
    """Load and cache XGBoost model/vectorizer on first use."""
    global _xgboost_model, _xgboost_vectorizer
    if _xgboost_model is None or _xgboost_vectorizer is None:
        _xgboost_model = joblib.load(config.XGBOOST_MODEL_PATH)
        _xgboost_vectorizer = joblib.load(config.XGBOOST_VECTORIZER_PATH)
    return _xgboost_model, _xgboost_vectorizer


def predict(text: str, model_type: str = "lr") -> dict:
    """Predict the probability of a mental health signal
    in the given text using the specified model type."""
    if model_type == "lr":
        return predictor.lr_predict(_lr_model, _lr_vectorizer, text)
    if model_type == "distilbert":
        return predictor.distilbert_predict(_get_distilbert_model(), text)
    if model_type == "xgboost":
        xgb_model, xgb_vectorizer = _get_xgboost_artifacts()
        return predictor.xgboost_predict(xgb_model, xgb_vectorizer, text)

    raise ValueError(f"Unsupported model_type: {model_type}")
