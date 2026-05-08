"""
Endpoints públicos de metadatos (tipo de cambio, etc).
"""
from fastapi import APIRouter

from app.services.exchange_rate_service import get_usd_to_clp

router = APIRouter(prefix="/api", tags=["Meta"])


@router.get("/exchange-rate")
def exchange_rate():
    """
    Tipo de cambio USD → CLP usando dólar Banco Central + recargo fijo de 5 CLP.
    """
    rate = get_usd_to_clp()
    return rate.to_dict()
