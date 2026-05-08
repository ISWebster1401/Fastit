"""
Servicio de tipo de cambio USD → CLP usando mindicador.cl (publica el dólar
del Banco Central de Chile, sin API key, gratis).

La política comercial de Fast-IT define un recargo fijo de +5 CLP sobre el
valor BCCh para absorber la fluctuación intradía y los costos asociados al
procesamiento del pago. El campo `surcharge` queda explícito en la respuesta
para que el frontend pueda mostrar el desglose si lo desea.

Cache en memoria con TTL configurable (default 30 min) y fallback hardcoded
si la API externa falla.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)


SOURCE_URL  = "https://mindicador.cl/api/dolar"
SURCHARGE   = 5.0
FALLBACK_BASE_RATE = 970.0


def _ttl_minutes() -> int:
    try:
        return int(os.getenv("EXCHANGE_RATE_TTL_MIN", "30"))
    except ValueError:
        return 30


@dataclass
class ExchangeRate:
    rate:         float           # = base_rate + surcharge (lo que cobra Fast-IT)
    base_rate:    float           # = valor publicado por el Banco Central
    surcharge:    float           # = 5.0 CLP fijo
    source:       str             # = "BCCh+5" en operación normal, "fallback" si la API falló
    updated_at:   str             # ISO 8601 UTC

    def to_dict(self) -> dict:
        return asdict(self)


_cache: dict = {"rate": None, "expires_at": None}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _build_rate(base_rate: float, source: str) -> ExchangeRate:
    return ExchangeRate(
        rate       = round(base_rate + SURCHARGE, 2),
        base_rate  = round(base_rate, 2),
        surcharge  = SURCHARGE,
        source     = source,
        updated_at = _now().isoformat(),
    )


def _fallback() -> ExchangeRate:
    return _build_rate(FALLBACK_BASE_RATE, source="fallback")


def _fetch_remote() -> Optional[ExchangeRate]:
    try:
        import httpx
    except ImportError:
        logger.warning("httpx no disponible para exchange_rate_service")
        return None

    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(SOURCE_URL)
        if resp.status_code != 200:
            logger.warning("mindicador.cl HTTP %s", resp.status_code)
            return None
        payload = resp.json()
    except Exception as exc:
        logger.warning("mindicador.cl fetch error: %s", exc)
        return None

    series = payload.get("serie") or []
    if not series:
        return None

    base = series[0].get("valor")
    if not isinstance(base, (int, float)) or base <= 0:
        return None

    return _build_rate(float(base), source="BCCh+5")


def get_usd_to_clp(force_refresh: bool = False) -> ExchangeRate:
    """
    Devuelve el tipo de cambio vigente. Cachea en memoria por TTL.
    Si la fuente externa falla y no hay cache, devuelve fallback.
    """
    cached: Optional[ExchangeRate] = _cache.get("rate")
    expires_at = _cache.get("expires_at")

    if not force_refresh and cached and expires_at and _now() < expires_at:
        return cached

    fresh = _fetch_remote()
    if fresh is None:
        if cached:
            _cache["expires_at"] = _now() + timedelta(minutes=5)
            return cached
        fresh = _fallback()

    _cache["rate"] = fresh
    _cache["expires_at"] = _now() + timedelta(minutes=_ttl_minutes())
    return fresh
