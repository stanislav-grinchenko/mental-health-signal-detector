from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from src.api.schemas import ExplainRequest, ExplainResponse, HealthResponse, PredictRequest, PredictResponse
from src.api.checkin_router import router as checkin_router
from src.api.solutions_router import router as solutions_router
from src.common.config import get_settings

# Imports ML optionnels — absents dans le déploiement slim (sans modèle)
try:
    from src.api.services import run_explain, run_prediction
    from src.api.dependencies import get_model
    _ML_AVAILABLE = True
except ImportError as _e:
    logger.warning(f"Packages ML indisponibles — endpoints /predict et /explain désactivés : {_e}")
    _ML_AVAILABLE = False
    get_model = None  # type: ignore[assignment]
    run_explain = None  # type: ignore[assignment]
    run_prediction = None  # type: ignore[assignment]


@asynccontextmanager
async def lifespan(app: FastAPI):
    if _ML_AVAILABLE:
        try:
            logger.info("Démarrage de l'API — chargement du modèle baseline...")
            get_model("baseline")
        except (FileNotFoundError, OSError) as e:
            logger.warning(f"Modèle baseline introuvable au démarrage (ignoré) : {e}")
    else:
        logger.info("Démarrage de l'API — mode slim (sans modèle ML).")
    yield
    logger.info("Arrêt de l'API.")


_settings = get_settings()

# Origines CORS autorisées.
# En dev : "*" pour simplifier.
# En prod : lire ALLOWED_ORIGINS depuis l'env (liste séparée par des virgules).
#   Ex: ALLOWED_ORIGINS=https://monapp.vercel.app,https://www.mondomaine.com
_raw_origins = _settings.allowed_origins
if _settings.env == "development" or _raw_origins == "*":
    _ALLOWED_ORIGINS: list[str] | str = ["*"]
else:
    _ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app = FastAPI(
    title="Mental Health Signal Detector API",
    description="Détecte des signaux de détresse mentale dans un texte via NLP.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(checkin_router)
app.include_router(solutions_router)


@app.get("/health", response_model=HealthResponse)
def health_check():
    if not _ML_AVAILABLE:
        return HealthResponse(status="ok", model_loaded=False)
    try:
        get_model("baseline")
        return HealthResponse(status="ok", model_loaded=True)
    except Exception:
        return HealthResponse(status="ok", model_loaded=False)


@app.post("/explain", response_model=ExplainResponse)
def explain_endpoint(request: ExplainRequest):
    """Retourne les contributions SHAP des mots les plus influents (baseline uniquement)."""
    if not _ML_AVAILABLE:
        raise HTTPException(status_code=503, detail="Modèle non disponible — déploiement slim.")
    try:
        model = get_model("baseline")
        return run_explain(request, model)
    except (FileNotFoundError, OSError) as e:
        logger.warning(f"Modèle indisponible (explain) : {e}")
        raise HTTPException(status_code=503, detail="Modèle non disponible — entraînement requis.")
    except Exception as e:
        logger.error(f"Erreur explain : {e}")
        raise HTTPException(status_code=500, detail="Erreur interne.")


@app.post("/predict", response_model=PredictResponse)
def predict_endpoint(request: PredictRequest):
    if not _ML_AVAILABLE:
        raise HTTPException(status_code=503, detail="Modèle non disponible — déploiement slim.")
    try:
        model = get_model(request.model_type)
        return run_prediction(request, model)
    except (FileNotFoundError, OSError) as e:
        logger.warning(f"Modèle indisponible : {e}")
        raise HTTPException(status_code=503, detail="Modèle non disponible — entraînement requis.")
    except Exception as e:
        logger.error(f"Erreur prédiction : {e}")
        raise HTTPException(status_code=500, detail="Erreur interne.")
