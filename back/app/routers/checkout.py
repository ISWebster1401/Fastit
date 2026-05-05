from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.schemas.order import CheckoutRequest, OrderOut
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/checkout", tags=["Checkout"])


@router.post("", response_model=OrderOut, status_code=201)
def checkout(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    total = 0.0
    items_data = []
    for item in payload.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Producto id={item.product_id} no encontrado",
            )
        unit_price = float(product.public_price)
        total += unit_price * item.quantity
        items_data.append({"product": product, "quantity": item.quantity, "unit_price": unit_price})

    order = Order(
        user_id                   = current_user.id,
        total_amount              = round(total, 2),
        status                    = OrderStatus.pending,
        document_type             = payload.document_type,
        invoice_rut               = payload.invoice_rut,
        invoice_business_name     = payload.invoice_business_name,
        invoice_business_activity = payload.invoice_business_activity,
    )
    db.add(order)
    db.flush()

    for d in items_data:
        db.add(OrderItem(
            order_id   = order.id,
            product_id = d["product"].id,
            quantity   = d["quantity"],
            unit_price = d["unit_price"],
        ))

    db.commit()
    db.refresh(order)
    return order
