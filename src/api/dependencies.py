from functools import lru_cache
from loguru import logger

# Liste blanche explicite — protège contre l'injection de chemins
_ALLOWED_MODEL_TYPES: frozenset[str] = frozenset({"baseline", "distilbert"})


@lru_cache(maxsize=2)
def get_model(model_type: str = "baseline"):
    """Charge chaque type de modèle une seule fois (cache par model_type).

    maxsize=2 pour conserver baseline et distilbert simultanément en mémoire.
    maxsize=1 évince le premier modèle dès qu'un second est demandé, ce qui
    provoquerait des rechargements coûteux selon l'ordre des requêtes.
    """
    if model_type not in _ALLOWED_MODEL_TYPES:
        raise ValueError(f"model_type invalide : {model_type!r}. Valeurs autorisées : {_ALLOWED_MODEL_TYPES}")
    from src.training.predict import load_model
    logger.info(f"Chargement modèle : {model_type}")
    return load_model(model_type)
