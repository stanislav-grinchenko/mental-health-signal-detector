"""
Router FastAPI — POST /solutions

Reçoit un DiagnosticProfile calculé côté frontend,
retourne le contenu thérapeutique adapté (messages, micro-actions, ressources).

Fondation pour l'intégration LLM future (génération personnalisée).
"""

from fastapi import APIRouter
from loguru import logger

from src.solutions.schemas import DiagnosticProfileRequest, SolutionResponse, VALID_EMOTION_IDS
from src.solutions.engine import compute_solution

router = APIRouter(prefix="/solutions", tags=["solutions"])


@router.post("", response_model=SolutionResponse)
def solutions_endpoint(profile: DiagnosticProfileRequest) -> SolutionResponse:
    """
    Calcule le protocole thérapeutique adapté à partir du profil diagnostique.

    - Mappe le profil vers un niveau de triage 0–4
    - Retourne messages empathiques, micro-actions CBT/ACT/mindfulness et ressources
    - Niveau 4 (crisis) : escalationRequired=True + ligne 3114 systématique
    """
    # Sanitisation de l'emotionId — inconnue → chaîne vide (évite les injections de clé)
    if profile.emotionId not in VALID_EMOTION_IDS:
        logger.warning(f"emotionId invalide reçu : {profile.emotionId!r} — remplacé par chaîne vide")
        profile = profile.model_copy(update={"emotionId": ""})

    solution = compute_solution(profile)

    logger.info(
        f"[solutions] emotion={profile.emotionId} mode={profile.mode} "
        f"level={solution.level} brick={solution.therapeuticBrick} "
        f"escalation={solution.escalationRequired}"
    )

    return solution
