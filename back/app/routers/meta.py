"""
Endpoints públicos de metadatos (tipo de cambio, etc).
"""
from fastapi import APIRouter

from app.services.exchange_rate_service import get_usd_to_clp

router = APIRouter(prefix="/api", tags=["Meta"])


@router.get("/exchange-rate")
def exchange_rate():
    """
    USD → CLP: valor referencia (BCCh vía mindicador.cl) + 5 CLP.
    La tasa cacheada se renueva en el próximo corte diario 18:30 hora Chile
    (campo `next_refresh_at` en la respuesta).
    """
    rate = get_usd_to_clp()
    return rate.to_dict()
