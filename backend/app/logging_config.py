import logging
import os
from logging.handlers import RotatingFileHandler


def setup_logging() -> None:
    """Configure application logging to write to a backend log file.

    Logs are written to:
      - backend/app/logs/error.log (rotating)

    Additionally, stderr/stdout will still receive logs via the root handlers.
    """

    log_dir = os.path.join(os.path.dirname(__file__), "logs")
    os.makedirs(log_dir, exist_ok=True)

    log_path = os.path.join(log_dir, "error.log")

    root_logger = logging.getLogger()

    # Avoid duplicate handler setup in reload/dev.
    if any(isinstance(h, RotatingFileHandler) and getattr(h, "baseFilename", "") == log_path for h in root_logger.handlers):
        return

    root_logger.setLevel(logging.INFO)

    file_handler = RotatingFileHandler(
        log_path,
        maxBytes=5 * 1024 * 1024,  # 5MB
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setLevel(logging.ERROR)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    file_handler.setFormatter(formatter)

    # Ensure FastAPI/Uvicorn exceptions propagate to this handler.
    root_logger.addHandler(file_handler)

