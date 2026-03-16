from functools import lru_cache
from loguru import logger


@lru_cache(maxsize=1)
def get_model(model_type: str = "baseline"):
    """Charge le modèle une seule fois au démarrage (singleton)."""
    from src.training.predict import load_model
    logger.info(f"Chargement modèle : {model_type}")
    return load_model(model_type)
