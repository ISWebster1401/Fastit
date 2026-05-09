from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.schemas.order import CheckoutRequest, OrderOut
from app.services.auth_service import get_current_user
from app.services.exchange_rate_service import get_usd_to_clp

router = APIRouter(prefix="/api/checkout", tags=["Checkout"])


@router.post("", response_model=OrderOut, status_code=201)
def checkout(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    total_usd = 0.0
    items_data = []
    for item in payload.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Producto id={item.product_id} no encontrado",
            )
        unit_price = float(product.public_price)
        total_usd += unit_price * item.quantity
        items_data.append({"product": product, "quantity": item.quantity, "unit_price": unit_price})

    # Convertir productos USD → CLP y sumar envío (ya viene en CLP)
    rate       = get_usd_to_clp()
    shipping   = float(payload.shipping_cost or 0)
    total_clp  = round(total_usd * rate.rate) + round(shipping)

    order = Order(
        user_id                   = current_user.id,
        total_amount              = total_clp,          # siempre en CLP
        exchange_rate_used        = rate.rate,
        status                    = OrderStatus.pending,
        document_type             = payload.document_type,
        invoice_rut               = payload.invoice_rut,
        invoice_business_name     = payload.invoice_business_name,
        invoice_business_activity = payload.invoice_business_activity,
        boleta_full_name          = payload.boleta_full_name,
        boleta_rut                = payload.boleta_rut,
        boleta_email              = payload.boleta_email,
        shipping_address          = payload.shipping_address,
        shipping_commune          = payload.shipping_commune,
        shipping_region           = payload.shipping_region,
        shipping_cost             = round(shipping),
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
