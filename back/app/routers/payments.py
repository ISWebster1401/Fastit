"""
Transbank WebpayPlus — Fast-IT / NADILOP
Flujo: crear transacción → usuario paga en Transbank → confirmar → disparar proveedor

En desarrollo usa las credenciales de integración (test) incluidas por defecto.
Para producción, setea TRANSBANK_COMMERCE_CODE, TRANSBANK_API_KEY, TRANSBANK_ENV=production en .env
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models.order import Order, OrderStatus
from app.services.auth_service import get_current_user
from app.services.supplier import supplier_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments", tags=["Payments"])

BUY_ORDER_PREFIX = "FIT"


def _build_transaction():
    try:
        from transbank.webpay.webpay_plus.transaction import Transaction
        from transbank.common.options import WebpayOptions
        from transbank.common.integration_type import IntegrationType
    except ImportError:
        raise HTTPException(503, "transbank-sdk no instalado. Ejecuta: pip install transbank-sdk")

    env = IntegrationType.TEST if settings.TRANSBANK_ENV != "production" else IntegrationType.LIVE
    options = WebpayOptions(
        commerce_code=settings.TRANSBANK_COMMERCE_CODE,
        api_key=settings.TRANSBANK_API_KEY,
        integration_type=env,
    )
    return Transaction(options)


class PaymentCreateRequest(BaseModel):
    order_id: int


@router.post("/create")
def create_payment(
    payload: PaymentCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    order = db.query(Order).filter(
        Order.id == payload.order_id,
        Order.user_id == current_user.id,
        Order.status == OrderStatus.pending,
    ).first()
    if not order:
        raise HTTPException(404, "Orden pendiente no encontrada")

    try:
        tx = _build_transaction()
        response = tx.create(
            buy_order=f"{BUY_ORDER_PREFIX}{order.id}",
            session_id=f"U{current_user.id}",
            amount=int(order.total_amount),
            return_url=f"{settings.BACKEND_URL}/api/payments/confirm",
        )
        return {"url": response["url"], "token": response["token"]}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error creando transacción Transbank")
        raise HTTPException(502, f"Error Transbank: {exc}")


@router.post("/confirm")
async def confirm_payment(
    token_ws: Optional[str] = Form(None),
    TBK_TOKEN: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    # Usuario canceló en Transbank
    if TBK_TOKEN and not token_ws:
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/payment-result?status=cancelled",
            status_code=302,
        )

    if not token_ws:
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/payment-result?status=error",
            status_code=302,
        )

    try:
        tx = _build_transaction()
        response = tx.commit(token=token_ws)

        # response_code == 0 → transacción aprobada
        if response.get("response_code") == 0:
            order_id = int(response["buy_order"][len(BUY_ORDER_PREFIX):])
            order = db.query(Order).filter(Order.id == order_id).first()

            if order and order.status == OrderStatus.pending:
                items = [
                    {"product_id": i.product_id, "quantity": i.quantity}
                    for i in order.items
                ]
                await supplier_service.create_purchase_order(order.id, items)
                order.status = OrderStatus.supplier_ordered
                db.commit()

            return RedirectResponse(
                f"{settings.FRONTEND_URL}/payment-result?status=success&order_id={order_id}",
                status_code=302,
            )
        else:
            return RedirectResponse(
                f"{settings.FRONTEND_URL}/payment-result?status=failed",
                status_code=302,
            )

    except Exception:
        logger.exception("Error confirmando pago Transbank")
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/payment-result?status=error",
            status_code=302,
        )
