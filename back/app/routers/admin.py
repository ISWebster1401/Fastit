from datetime import datetime, timedelta, timezone
from typing import Optional
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.user import User
from app.schemas.order import OrderOut
from app.services.auth_service import require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin"])


class StatusUpdate(BaseModel):
    status: OrderStatus


class UserAdminOut(BaseModel):
    id:               int
    email:            str
    is_company:       bool
    is_admin:         bool
    is_active:        bool
    email_verified:   bool
    business_name:    Optional[str] = None
    rut:              Optional[str] = None
    total_orders:     int = 0
    total_spent:      float = 0.0
    model_config = {"from_attributes": True}


# ─── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    total_orders    = db.query(func.count(Order.id)).scalar() or 0
    total_revenue   = float(db.query(func.sum(Order.total_amount)).scalar() or 0)
    pending_count   = db.query(func.count(Order.id)).filter(Order.status == OrderStatus.pending).scalar() or 0
    delivered_count = db.query(func.count(Order.id)).filter(Order.status == OrderStatus.delivered).scalar() or 0
    total_users     = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    verified_users  = db.query(func.count(User.id)).filter(User.email_verified == True, User.is_active == True).scalar() or 0

    by_status = {
        s.value: db.query(func.count(Order.id)).filter(Order.status == s).scalar() or 0
        for s in OrderStatus
    }

    return {
        "total_orders":    total_orders,
        "total_revenue":   total_revenue,
        "pending_count":   pending_count,
        "delivered_count": delivered_count,
        "total_users":     total_users,
        "verified_users":  verified_users,
        "by_status":       by_status,
    }


@router.get("/stats/timeline")
def get_timeline(
    days: int = Query(default=30, ge=7, le=90),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(
            func.date(Order.created_at).label("date"),
            func.count(Order.id).label("orders"),
            func.sum(Order.total_amount).label("revenue"),
        )
        .filter(Order.created_at >= since)
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
        .all()
    )
    result_map = {str(r.date): {"orders": r.orders, "revenue": float(r.revenue or 0)} for r in rows}
    timeline = []
    for i in range(days):
        day = (datetime.now(timezone.utc) - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        entry = result_map.get(day, {"orders": 0, "revenue": 0.0})
        timeline.append({"date": day, **entry})
    return {"days": days, "timeline": timeline}


# ─── Órdenes ──────────────────────────────────────────────────────────────────

@router.get("/orders", response_model=list[OrderOut])
def list_all_orders(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    return db.query(Order).order_by(Order.created_at.desc()).all()


@router.patch("/orders/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: int,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order


# ─── Usuarios ─────────────────────────────────────────────────────────────────

@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    users = db.query(User).order_by(User.id.desc()).all()
    result = []
    for u in users:
        total_orders = db.query(func.count(Order.id)).filter(Order.user_id == u.id).scalar() or 0
        total_spent  = float(db.query(func.sum(Order.total_amount)).filter(Order.user_id == u.id).scalar() or 0)
        result.append({
            "id":             u.id,
            "email":          u.email,
            "is_company":     u.is_company,
            "is_admin":       u.is_admin,
            "is_active":      getattr(u, 'is_active', True),
            "email_verified": getattr(u, 'email_verified', False),
            "business_name":  u.business_name,
            "rut":            u.rut,
            "total_orders":   total_orders,
            "total_spent":    total_spent,
        })
    return result


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(require_admin),
):
    if user_id == current_admin.id:
        raise HTTPException(400, "No puedes eliminar tu propia cuenta")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    if user.is_admin:
        raise HTTPException(403, "No se puede eliminar a otro administrador")

    # Eliminar items de órdenes, luego órdenes, luego usuario
    order_ids = [o.id for o in db.query(Order.id).filter(Order.user_id == user_id).all()]
    if order_ids:
        db.query(OrderItem).filter(OrderItem.order_id.in_(order_ids)).delete(synchronize_session=False)
        db.query(Order).filter(Order.user_id == user_id).delete(synchronize_session=False)

    db.delete(user)
    db.commit()
    return {"message": f"Usuario {user.email} eliminado"}


@router.patch("/users/{user_id}/toggle-active")
def toggle_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(require_admin),
):
    if user_id == current_admin.id:
        raise HTTPException(400, "No puedes desactivar tu propia cuenta")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    user.is_active = not getattr(user, 'is_active', True)
    db.commit()
    return {"is_active": user.is_active}


# ─── Icecat import flow ───────────────────────────────────────────────────────

import os
import shutil
import uuid
from datetime import timezone
from fastapi import File, Form, UploadFile
from app.services.icecat_service import parse_icecat_url, map_to_internal, get_provider
from app.schemas.product import IcecatPreviewOut, IcecatImportConfirm
from app.services.pricing import calculate_public_price

_PRODUCTS_IMG_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "static", "products")


def _ensure_img_dir():
    os.makedirs(_PRODUCTS_IMG_DIR, exist_ok=True)


@router.post("/products/import/preview", response_model=IcecatPreviewOut)
async def import_preview(
    icecat_url: str       = Form(...),
    image_file: Optional[UploadFile] = File(default=None),
    remove_bg:  bool      = Form(default=False),
    db: Session           = Depends(get_db),
    _=Depends(require_admin),
):
    """
    Step 1 — fetch Icecat data and return a preview payload for the admin to edit.
    Optionally accept a custom image file.
    remove_bg is accepted but background removal is not yet implemented (TODO).
    """
    # 1. Parse URL → product ID
    try:
        ref = parse_icecat_url(icecat_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # 2. Fetch from Icecat (real or mock)
    provider = get_provider()
    raw = await provider.fetch(ref.product_id)
    if raw is None:
        raise HTTPException(
            status_code=404,
            detail=f"Producto con ID {ref.product_id} no encontrado en Icecat."
        )

    # 3. Map to internal preview
    mapped = map_to_internal(raw, ref.source_url)

    # 4. Handle uploaded image (overrides Icecat image)
    final_image_url = mapped.image_url
    if image_file and image_file.filename:
        _ensure_img_dir()
        ext      = os.path.splitext(image_file.filename)[-1].lower() or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        dest     = os.path.join(_PRODUCTS_IMG_DIR, filename)
        with open(dest, "wb") as fh:
            shutil.copyfileobj(image_file.file, fh)
        final_image_url = f"/products-images/{filename}"
        # TODO: if remove_bg, apply rembg here before saving
        if remove_bg:
            import logging
            logging.getLogger(__name__).info(
                "remove_bg requested for %s — not yet implemented", filename
            )

    return IcecatPreviewOut(
        icecat_product_id  = mapped.source_product_id,
        source_url         = mapped.source_url,
        sku                = mapped.sku,
        name               = mapped.name,
        brand              = mapped.brand,
        category           = mapped.category,
        description        = mapped.description,
        technical_specs    = mapped.technical_specs,
        image_url          = final_image_url,
        raw_source_payload = mapped.raw_source_payload,
    )


@router.post("/products/import/confirm", response_model=dict)
def import_confirm(
    payload: IcecatImportConfirm,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """
    Step 2 — create (or update) the product from the edited preview payload.
    Returns the created/updated product id and sku.
    """
    existing = db.query(Product).filter(Product.sku == payload.sku).first()

    if existing and not payload.update_existing:
        raise HTTPException(
            status_code=409,
            detail={
                "message": f"El SKU '{payload.sku}' ya existe.",
                "existing_id": existing.id,
                "hint": "Envía update_existing=true para sobreescribir.",
            },
        )

    public_price = calculate_public_price(payload.base_price, payload.category)
    now          = datetime.now(timezone.utc).replace(tzinfo=None)

    if existing and payload.update_existing:
        existing.name               = payload.name
        existing.brand              = payload.brand
        existing.category           = payload.category
        existing.description        = payload.description
        existing.technical_specs    = payload.technical_specs
        existing.image_url          = payload.image_url
        existing.base_price         = payload.base_price
        existing.public_price       = public_price
        existing.stock_status       = payload.stock_status
        existing.source             = "icecat"
        existing.source_url         = payload.source_url
        existing.source_product_id  = payload.icecat_product_id
        existing.source_synced_at   = now
        existing.raw_source_payload = payload.raw_source_payload
        db.commit()
        return {"action": "updated", "id": existing.id, "sku": existing.sku}

    product = Product(
        sku                = payload.sku,
        name               = payload.name,
        brand              = payload.brand,
        category           = payload.category,
        description        = payload.description,
        technical_specs    = payload.technical_specs,
        image_url          = payload.image_url,
        base_price         = payload.base_price,
        public_price       = public_price,
        stock_status       = payload.stock_status,
        source             = "icecat",
        source_url         = payload.source_url,
        source_product_id  = payload.icecat_product_id,
        source_synced_at   = now,
        raw_source_payload = payload.raw_source_payload,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return {"action": "created", "id": product.id, "sku": product.sku}


@router.get("/products")
def list_admin_products(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """List all products with source info for the admin panel."""
    products = db.query(Product).order_by(Product.id.desc()).all()
    return [
        {
            "id":               p.id,
            "sku":              p.sku,
            "name":             p.name,
            "brand":            p.brand,
            "category":         p.category,
            "public_price":     float(p.public_price),
            "stock_status":     p.stock_status.value,
            "source":           getattr(p, "source", "manual"),
            "source_url":       getattr(p, "source_url", None),
            "source_synced_at": (
                getattr(p, "source_synced_at", None).isoformat()
                if getattr(p, "source_synced_at", None) else None
            ),
        }
        for p in products
    ]


@router.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Delete a product by ID (only if it has no associated orders)."""
    from app.models.order import OrderItem
    has_orders = db.query(OrderItem).filter(OrderItem.product_id == product_id).first()
    if has_orders:
        raise HTTPException(409, "No se puede eliminar: el producto tiene órdenes asociadas.")
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Producto no encontrado")
    db.delete(product)
    db.commit()
    return {"message": f"Producto {product.sku} eliminado"}
