"""
Détection de langue et traduction vers l'anglais.
Langues supportées : anglais (en), français (fr).
"""

from loguru import logger


SUPPORTED_LANGS = {"en", "fr"}


def detect_language(text: str) -> str:
    """Détecte la langue d'un texte. Retourne le code ISO (ex: 'fr', 'en').

    Seed fixé pour garantir des résultats déterministes (langdetect est
    non-déterministe par défaut — même texte peut donner des langues différentes).
    Textes trop courts (<8 caractères) : fallback 'en' pour éviter les faux positifs.
    """
    if not isinstance(text, str) or len(text.strip()) < 8:
        return "en"
    try:
        from langdetect import detect, DetectorFactory
        DetectorFactory.seed = 42
        lang = detect(text)
        return lang if lang in SUPPORTED_LANGS else "en"
    except Exception:
        return "en"  # fallback anglais


_TRANSLATION_TIMEOUT = 5  # secondes


def translate_to_english(text: str, source_lang: str) -> str:
    """Traduit le texte vers l'anglais si nécessaire."""
    if source_lang == "en":
        return text
    try:
        import signal

        from deep_translator import GoogleTranslator

        def _timeout_handler(signum, frame):
            raise TimeoutError("Traduction trop lente")

        signal.signal(signal.SIGALRM, _timeout_handler)
        signal.alarm(_TRANSLATION_TIMEOUT)
        try:
            translated = GoogleTranslator(source=source_lang, target="en").translate(text)
        finally:
            signal.alarm(0)

        # Ne pas loguer le texte brut (données santé sensibles)
        logger.debug(f"Traduction [{source_lang}→en] effectuée ({len(text)} caractères)")
        return translated
    except Exception as e:
        logger.warning(f"Échec traduction ({type(e).__name__}), texte original utilisé.")
        return text


def prepare_text(text: str) -> tuple[str, str]:
    """
    Détecte la langue et traduit si nécessaire.
    Retourne (texte_en_anglais, langue_détectée).
    """
    lang = detect_language(text)
    text_en = translate_to_english(text, lang)
    return text_en, lang
