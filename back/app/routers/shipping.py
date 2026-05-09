from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product
from app.services.chilexpress_service import quote, COMMUNES

router = APIRouter(prefix="/api/shipping", tags=["Shipping"])

# Pesos por defecto (kg) cuando el producto no tiene dimensiones cargadas
_DEFAULT_WEIGHT: dict[str, float] = {
    "servers":      18.0,
    "storage":      12.0,
    "networking":    4.0,
    "workstations": 22.0,
    "accessories":   1.5,
}


@router.get("/communes")
def list_communes():
    return [
        {"commune": name, "region": code_region[1]}
        for name, code_region in sorted(COMMUNES.items())
    ]


@router.get("/quote")
def shipping_quote(
    commune: str = Query(...),
    product_ids: Optional[str] = Query(default=None, description="IDs separados por coma, ej: 1,2,3"),
    weight_kg: float = Query(default=0.0, ge=0, le=2000),
    declared_value_clp: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Cotiza envío a una comuna.
    Si se pasan product_ids, calcula el peso total sumando los productos del carrito.
    Si no, usa weight_kg (o el default 5 kg).
    """
    total_weight = weight_kg

    if product_ids:
        ids = [int(x) for x in product_ids.split(",") if x.strip().isdigit()]
        products = db.query(Product).filter(Product.id.in_(ids)).all()
        if products:
            total_weight = sum(
                float(p.weight_kg) if p.weight_kg else _DEFAULT_WEIGHT.get(p.category, 5.0)
                for p in products
            )

    if total_weight <= 0:
        total_weight = 5.0

    result = quote(commune, total_weight, declared_value_clp)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Comuna '{commune}' no encontrada. Usa GET /api/shipping/communes.",
        )
    return {
        "commune":       result.commune,
        "region":        result.region,
        "price_clp":     result.price_clp,
        "service_name":  result.service_name,
        "days_estimate": result.days_estimate,
        "weight_kg":     round(total_weight, 2),
        "is_mock":       result.is_mock,
    }
