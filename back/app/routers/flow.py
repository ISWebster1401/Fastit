"""
Flow.cl — pasarela alternativa a Transbank.
Registrar en sandbox.flow.cl para obtener FLOW_API_KEY + FLOW_SECRET.
Prod: cambiar FLOW_API_URL=https://www.flow.cl/api en .env

Flujo:
  1. POST /api/flow/create  → crea orden en Flow, devuelve {url, token}
  2. Frontend redirige usuario a url?token=token
  3. Usuario paga en Flow
  4. Flow hace GET a urlConfirmation con token (server-to-server) → respondemos "OK"
  5. Flow redirige browser a /api/flow/return?token=token
  6. Backend verifica, actualiza orden, redirige al frontend /payment-result
"""
import hashlib
import hmac
import logging
from typing import Optional

import requests as http
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models.order import Order, OrderStatus
from app.services.auth_service import get_current_user
from app.services.supplier import supplier_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/flow", tags=["Flow"])

ORDER_PREFIX = "FIT"


def _sign(params: dict) -> str:
    keys = sorted(params.keys())
    to_sign = "".join(f"{k}{params[k]}" for k in keys)
    return hmac.new(
        settings.FLOW_SECRET.encode("utf-8"),
        to_sign.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _flow_post(endpoint: str, params: dict) -> dict:
    params["s"] = _sign(params)
    resp = http.post(f"{settings.FLOW_API_URL}/{endpoint}", data=params, timeout=15)
    if not resp.ok:
        raise HTTPException(502, f"Flow error {resp.status_code}: {resp.text[:200]}")
    return resp.json()


def _flow_get(endpoint: str, params: dict) -> dict:
    params["s"] = _sign(params)
    resp = http.get(f"{settings.FLOW_API_URL}/{endpoint}", params=params, timeout=15)
    if not resp.ok:
        raise HTTPException(502, f"Flow error {resp.status_code}: {resp.text[:200]}")
    return resp.json()


class FlowCreateRequest(BaseModel):
    order_id: int


@router.post("/create")
def create_flow_payment(
    payload: FlowCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if settings.FLOW_API_KEY == "FLOW_API_KEY_AQUI":
        raise HTTPException(
            503,
            "Flow no configurado. Agrega FLOW_API_KEY y FLOW_SECRET en back/.env "
            "(regístrate en sandbox.flow.cl para obtener credenciales de prueba).",
        )

    order = db.query(Order).filter(
        Order.id == payload.order_id,
        Order.user_id == current_user.id,
        Order.status == OrderStatus.pending,
    ).first()
    if not order:
        raise HTTPException(404, "Orden pendiente no encontrada")

    amount_clp = int(order.total_amount * settings.FLOW_CLP_RATE)

    params = {
        "apiKey":          settings.FLOW_API_KEY,
        "commerceOrder":   f"{ORDER_PREFIX}{order.id}",
        "subject":         "Compra Fast-IT",
        "currency":        "CLP",
        "amount":          amount_clp,
        "email":           current_user.email,
        "urlConfirmation": f"{settings.BACKEND_URL}/api/flow/webhook",
        "urlReturn":       f"{settings.BACKEND_URL}/api/flow/return",
    }

    try:
        data = _flow_post("payment/create", params)
        return {
            "url":   f"{data['url']}?token={data['token']}",
            "token": data["token"],
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error creando pago Flow")
        raise HTTPException(502, f"Error Flow: {exc}")


@router.get("/webhook", response_class=PlainTextResponse)
async def flow_webhook(
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    """Confirmación server-to-server que Flow llama tras el pago."""
    try:
        params = {"apiKey": settings.FLOW_API_KEY, "token": token}
        data = _flow_get("payment/getStatus", params)

        if data.get("status") == 2:  # 2 = pagado en Flow
            commerce_order = data.get("commerceOrder", "")
            order_id = int(commerce_order[len(ORDER_PREFIX):])
            order = db.query(Order).filter(Order.id == order_id).first()

            if order and order.status == OrderStatus.pending:
                items = [
                    {"product_id": i.product_id, "quantity": i.quantity}
                    for i in order.items
                ]
                await supplier_service.create_purchase_order(order.id, items)
                order.status = OrderStatus.supplier_ordered
                db.commit()
    except Exception:
        logger.exception("Error en webhook Flow")

    return "OK"


@router.get("/return")
def flow_return(
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    """Flow redirige el browser aquí después del pago."""
    try:
        params = {"apiKey": settings.FLOW_API_KEY, "token": token}
        data = _flow_get("payment/getStatus", params)
        status = data.get("status")

        if status == 2:
            commerce_order = data.get("commerceOrder", "")
            order_id = int(commerce_order[len(ORDER_PREFIX):])
            return RedirectResponse(
                f"{settings.FRONTEND_URL}/payment-result?status=success&order_id={order_id}",
                status_code=302,
            )
        elif status == 3:
            return RedirectResponse(
                f"{settings.FRONTEND_URL}/payment-result?status=cancelled",
                status_code=302,
            )
        else:
            return RedirectResponse(
                f"{settings.FRONTEND_URL}/payment-result?status=failed",
                status_code=302,
            )
    except Exception:
        logger.exception("Error en return Flow")
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/payment-result?status=error",
            status_code=302,
        )
