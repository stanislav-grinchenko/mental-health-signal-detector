import sys
from loguru import logger
from src.common.config import get_settings


def setup_logging() -> None:
    settings = get_settings()
    logger.remove()
    logger.add(
        sys.stderr,
        level=settings.log_level,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level}</level> | <cyan>{name}</cyan> - {message}",
    )
    logger.add(
        "logs/app.log",
        level=settings.log_level,
        rotation="10 MB",
        retention="7 days",
        compression="zip",
    )
