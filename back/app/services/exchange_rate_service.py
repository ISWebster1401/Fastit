"""
Servicio de tipo de cambio USD → CLP usando mindicador.cl (dólar referencia BCCh).

Política Fast-IT:
- Se toma el valor publicado por mindicador (serie BCCh).
- Se suma un recargo fijo de +5 CLP sobre ese valor.
- La tasa **vigente para cobros** se actualiza una vez al día a las **18:30 hora de Chile**
  (America/Santiago): hasta esa hora se reutiliza la tasa del último cierre; tras las 18:30
  se permite un nuevo fetch (mindicador suele reflejar el dólar oficial del día hábil).

Cache: expira en el próximo horario de corte 18:30 Chile (convertido a UTC internamente).
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass, asdict, field
from datetime import datetime, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)

SOURCE_URL = "https://mindicador.cl/api/dolar"
SURCHARGE = 5.0
FALLBACK_BASE_RATE = 970.0
CHILE_TZ = ZoneInfo("America/Santiago")

# Hora de actualización diaria (Chile)
_UPDATE_HOUR = 18
_UPDATE_MINUTE = 30


@dataclass
class ExchangeRate:
    rate: float  # base_rate + surcharge
    base_rate: float
    surcharge: float
    source: str
    updated_at: str  # ISO UTC
    next_refresh_at: str = ""  # ISO 8601 hora Chile (información para el cliente)
    policy_note: str = field(default="BCCh vía mindicador + 5 CLP; corte diario 18:30 Chile")

    def to_dict(self) -> dict:
        return asdict(self)


_cache: dict = {"rate": None, "expires_at": None}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _next_cutoff_utc_chile_1830(after_utc: datetime) -> datetime:
    """
    Próximo instante (en UTC) en que son las 18:30 en Chile, estrictamente después de `after_utc`.
    """
    after_cl = after_utc.astimezone(CHILE_TZ)
    candidate = after_cl.replace(hour=_UPDATE_HOUR, minute=_UPDATE_MINUTE, second=0, microsecond=0)
    if after_cl >= candidate:
        candidate = candidate + timedelta(days=1)
    return candidate.astimezone(timezone.utc)


def _chile_iso(dt_utc: datetime) -> str:
    return dt_utc.astimezone(CHILE_TZ).isoformat(timespec="seconds")


def _build_rate(base_rate: float, source: str) -> ExchangeRate:
    expires = _next_cutoff_utc_chile_1830(_now_utc())
    return ExchangeRate(
        rate=round(base_rate + SURCHARGE, 2),
        base_rate=round(base_rate, 2),
        surcharge=SURCHARGE,
        source=source,
        updated_at=_now_utc().isoformat(),
        next_refresh_at=_chile_iso(expires),
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
    Devuelve el tipo vigente. Entre cortes (18:30 Chile) se sirve la misma tasa cacheada.
    """
    cached: Optional[ExchangeRate] = _cache.get("rate")
    expires_at: Optional[datetime] = _cache.get("expires_at")

    if not force_refresh and cached and expires_at and _now_utc() < expires_at:
        return cached

    fresh = _fetch_remote()
    if fresh is None:
        if cached:
            # Mantener tasa anterior un poco si la API falla
            short = _now_utc() + timedelta(minutes=15)
            _cache["expires_at"] = short
            return cached
        fresh = _fallback()

    _cache["rate"] = fresh
    _cache["expires_at"] = _next_cutoff_utc_chile_1830(_now_utc())
    return fresh
