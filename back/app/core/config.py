import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, Optional


def _parse_bool(value: Optional[str], default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass
class Settings:
    APP_NAME: str = "Fast-IT API"
    DATABASE_URL: str = "sqlite:///./fastit.db"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    NADILOP_ESCALATION_THRESHOLD_USD: float = 50_000.0
    # Transbank WebpayPlus (defaults = integration/test credentials)
    TRANSBANK_COMMERCE_CODE: str = "597055555532"
    TRANSBANK_API_KEY: str = "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C"
    TRANSBANK_ENV: str = "test"  # "test" | "production"
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:5173"
    # Flow.cl (registrar en sandbox.flow.cl para obtener credenciales)
    FLOW_API_KEY: str = "FLOW_API_KEY_AQUI"
    FLOW_SECRET: str = "FLOW_SECRET_AQUI"
    FLOW_API_URL: str = "https://sandbox.flow.cl/api"  # prod: https://www.flow.cl/api
    FLOW_CLP_RATE: float = 970.0  # USD → CLP para el monto Flow
    # SendGrid
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "noreply@fastit.cl"
    CATEGORY_MARGINS: Dict[str, float] = field(
        default_factory=lambda: {
            "storage": 0.22,
            "servers": 0.18,
            "networking": 0.20,
            "accessories": 0.30,
            "default": 0.25,
        }
    )


def _build_settings() -> Settings:
    # Lightweight .env support without external dependency.
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if env_path.exists():
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())

    return Settings(
        APP_NAME=os.getenv("APP_NAME", "Fast-IT API"),
        DATABASE_URL=os.getenv("DATABASE_URL", "sqlite:///./fastit.db"),
        DEBUG=_parse_bool(os.getenv("DEBUG"), True),
        OPENAI_API_KEY=os.getenv("OPENAI_API_KEY", ""),
        OPENAI_MODEL=os.getenv("OPENAI_MODEL", "gpt-4o"),
        NADILOP_ESCALATION_THRESHOLD_USD=float(os.getenv("NADILOP_ESCALATION_THRESHOLD_USD", "50000")),
        TRANSBANK_COMMERCE_CODE=os.getenv("TRANSBANK_COMMERCE_CODE", "597055555532"),
        TRANSBANK_API_KEY=os.getenv("TRANSBANK_API_KEY", "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C"),
        TRANSBANK_ENV=os.getenv("TRANSBANK_ENV", "test"),
        BACKEND_URL=os.getenv("BACKEND_URL", "http://localhost:8000"),
        FRONTEND_URL=os.getenv("FRONTEND_URL", "http://localhost:5173"),
        FLOW_API_KEY=os.getenv("FLOW_API_KEY", "FLOW_API_KEY_AQUI"),
        FLOW_SECRET=os.getenv("FLOW_SECRET", "FLOW_SECRET_AQUI"),
        FLOW_API_URL=os.getenv("FLOW_API_URL", "https://sandbox.flow.cl/api"),
        FLOW_CLP_RATE=float(os.getenv("FLOW_CLP_RATE", "970")),
        SENDGRID_API_KEY=os.getenv("SENDGRID_API_KEY", ""),
        SENDGRID_FROM_EMAIL=os.getenv("SENDGRID_FROM_EMAIL", "noreply@fastit.cl"),
    )


settings = _build_settings()
