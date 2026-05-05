from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.order import Order, OrderStatus
from app.schemas.order import PaymentWebhookPayload, OrderOut
from app.services.supplier import supplier_service

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])


@router.post("/payment", response_model=OrderOut)
async def payment_webhook(payload: PaymentWebhookPayload, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == payload.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    if order.status != OrderStatus.pending:
        raise HTTPException(
            status_code=409,
            detail=f"La orden ya fue procesada (estado actual: {order.status})",
        )

    if payload.payment_status != "approved":
        # Pago rechazado: no cambiamos el estado, solo registramos
        return order

    # Pago aprobado: disparar orden al mayorista
    items_for_supplier = [
        {"product_id": item.product_id, "quantity": item.quantity}
        for item in order.items
    ]
    await supplier_service.create_purchase_order(order.id, items_for_supplier)

    order.status = OrderStatus.supplier_ordered
    db.commit()
    db.refresh(order)
    return order
