import json
import logging
import os
import shutil
import uuid
from datetime import datetime, timedelta, timezone, date, time as dt_time
from typing import Optional

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload, selectinload
from pydantic import BaseModel

from app.database import get_db
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.user import User
from app.models.customer_spend_tier import CustomerSpendTier
from app.schemas.order import OrderOut, OrdersSearchOut
from app.schemas.product import IcecatPreviewOut, IcecatImportConfirm
from app.services.auth_service import require_admin
from app.services.icecat_service import get_provider, map_to_internal, parse_icecat_url
from app.services.pricing import calculate_public_price
from app.services import email_service

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


def _usd_total_expr():
    """
    Transforma el total guardado en CLP a USD equivalente usando el tipo de cambio
    snapshot del momento de la compra (`exchange_rate_used`).
    """
    return Order.total_amount / func.coalesce(Order.exchange_rate_used, 1)


def _get_date_range(start_date: Optional[date], end_date: Optional[date]) -> Optional[tuple[datetime, datetime]]:
    if start_date is None and end_date is None:
        return None
    if start_date is None or end_date is None:
        raise HTTPException(
            status_code=422,
            detail="start_date y end_date deben enviarse juntos (o ninguno).",
        )
    if end_date < start_date:
        raise HTTPException(status_code=422, detail="end_date debe ser >= start_date.")

    since = datetime.combine(start_date, dt_time.min).replace(tzinfo=timezone.utc)
    until = datetime.combine(end_date, dt_time.max).replace(tzinfo=timezone.utc)
    return since, until


def _ensure_default_customer_spend_tiers(db: Session) -> list[CustomerSpendTier]:
    tiers = (
        db.query(CustomerSpendTier)
        .order_by(CustomerSpendTier.display_order.asc())
        .all()
    )
    if tiers:
        return tiers

    defaults = [
        {"name": "Bronze", "min_spent_usd": 0, "color_hex": "#94a3b8", "display_order": 1},
        {"name": "Silver", "min_spent_usd": 5000, "color_hex": "#60a5fa", "display_order": 2},
        {"name": "Gold", "min_spent_usd": 20000, "color_hex": "#fbbf24", "display_order": 3},
        {"name": "Platinum", "min_spent_usd": 50000, "color_hex": "#10b981", "display_order": 4},
    ]

    db.add_all([CustomerSpendTier(**d) for d in defaults])
    db.commit()

    return (
        db.query(CustomerSpendTier)
        .order_by(CustomerSpendTier.display_order.asc())
        .all()
    )


def _select_tier_for_spent_usd(tiers: list[CustomerSpendTier], spent_usd: float) -> CustomerSpendTier:
    """
    Devuelve el mejor tier cuyo `min_spent_usd` sea <= spent_usd.
    """
    best = tiers[0]
    for t in sorted(tiers, key=lambda x: float(x.min_spent_usd)):
        if spent_usd >= float(t.min_spent_usd):
            best = t
    return best


# ─── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    include_quotes: bool = Query(default=False),
):
    date_range = _get_date_range(start_date, end_date)

    # Las cotizaciones (is_quote=True) nunca se pagan: no cuentan como revenue real,
    # pero sí deben existir en gráficos cuando `include_quotes=true`.
    paid_filter = Order.is_quote.isnot(True)
    quote_filter = Order.is_quote.is_(True)

    q_paid = db.query(Order).filter(paid_filter)
    q_quotes = db.query(Order).filter(quote_filter)
    if date_range:
        since, until = date_range
        q_paid = q_paid.filter(Order.created_at >= since, Order.created_at <= until)
        q_quotes = q_quotes.filter(Order.created_at >= since, Order.created_at <= until)

    total_orders = q_paid.with_entities(func.count(Order.id)).scalar() or 0
    total_revenue = float(q_paid.with_entities(func.sum(_usd_total_expr())).scalar() or 0)
    pending_count = (
        q_paid.filter(Order.status == OrderStatus.pending)
        .with_entities(func.count(Order.id)).scalar() or 0
    )
    delivered_count = (
        q_paid.filter(Order.status == OrderStatus.delivered)
        .with_entities(func.count(Order.id)).scalar() or 0
    )

    quote_count = q_quotes.with_entities(func.count(Order.id)).scalar() or 0
    quote_revenue = float(q_quotes.with_entities(func.sum(_usd_total_expr())).scalar() or 0)

    total_users     = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    verified_users  = db.query(func.count(User.id)).filter(User.email_verified == True, User.is_active == True).scalar() or 0

    avg_order_value = round(total_revenue / total_orders, 2) if total_orders else 0.0

    by_status_paid = {
        s.value: (
            q_paid.filter(Order.status == s)
            .with_entities(func.count(Order.id)).scalar() or 0
        )
        for s in OrderStatus
    }
    by_status_quotes = {
        s.value: (
            q_quotes.filter(Order.status == s)
            .with_entities(func.count(Order.id)).scalar() or 0
        )
        for s in OrderStatus
    }

    by_status_all = {
        k: (by_status_paid.get(k, 0) + by_status_quotes.get(k, 0))
        for k in by_status_paid.keys()
    }

    # Backlog aging / lead-time proxy (sin timestamps de transición de estado,
    # aproximamos con (now - created_at) para órdenes en el estado actual).
    now = datetime.now(timezone.utc)
    aging_paid = {s.value: [] for s in OrderStatus}
    aging_quotes = {s.value: [] for s in OrderStatus}

    for o in q_paid.all():
        if not o.created_at:
            continue
        created_at = o.created_at
        if getattr(created_at, "tzinfo", None) is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        age_days = (now - created_at).total_seconds() / 86400
        aging_paid[o.status.value].append(age_days)

    for o in q_quotes.all():
        if not o.created_at:
            continue
        created_at = o.created_at
        if getattr(created_at, "tzinfo", None) is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        age_days = (now - created_at).total_seconds() / 86400
        aging_quotes[o.status.value].append(age_days)

    aging_by_status_paid = {
        s: {
            "count": len(ages),
            "avg_age_days": round((sum(ages) / len(ages)), 2) if ages else 0.0,
        }
        for s, ages in aging_paid.items()
    }
    aging_by_status_quotes = {
        s: {
            "count": len(ages),
            "avg_age_days": round((sum(ages) / len(ages)), 2) if ages else 0.0,
        }
        for s, ages in aging_quotes.items()
    }

    delivered_paid_days = aging_paid[OrderStatus.delivered.value]
    avg_days_in_system_delivered_paid = (
        round(sum(delivered_paid_days) / len(delivered_paid_days), 2)
        if delivered_paid_days
        else 0.0
    )

    return {
        # KPIs “reales”: excluyen cotizaciones.
        "total_orders":    total_orders,
        "total_revenue":   total_revenue,
        "pending_count":   pending_count,
        "delivered_count": delivered_count,
        "quote_count":     quote_count,
        "avg_order_value": avg_order_value,
        "quote_revenue":   quote_revenue,
        "total_users":     total_users,
        "verified_users":  verified_users,
        # Compatibilidad: `by_status` históricamente era excluyendo cotizaciones.
        "by_status":         by_status_paid,
        "by_status_quotes":  by_status_quotes,
        "by_status_all":     by_status_all,
        # Front usa `include_quotes` para escoger cuál set dibujar.
        "include_quotes": include_quotes,
        "aging_by_status_paid": aging_by_status_paid,
        "aging_by_status_quotes": aging_by_status_quotes,
        "avg_days_in_system_delivered_paid": avg_days_in_system_delivered_paid,
    }


@router.get("/stats/timeline")
def get_timeline(
    days: int = Query(default=30, ge=7, le=90),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    include_quotes: bool = Query(default=False),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    now = datetime.now(timezone.utc)
    date_range = _get_date_range(start_date, end_date)

    if date_range:
        since, until = date_range
        start_day = since.date()
        end_day = until.date()
        days_count = (end_day - start_day).days + 1
    else:
        end_day = now.date()
        start_day = (now - timedelta(days=days - 1)).date()
        days_count = days
        since = datetime.combine(start_day, dt_time.min).replace(tzinfo=timezone.utc)
        until = datetime.combine(end_day, dt_time.max).replace(tzinfo=timezone.utc)

    paid_rows = (
        db.query(
            func.date(Order.created_at).label("date"),
            func.count(Order.id).label("orders"),
            func.sum(_usd_total_expr()).label("revenue"),
        )
        .filter(Order.created_at >= since, Order.created_at <= until, Order.is_quote.isnot(True))
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
        .all()
    )
    paid_map = {
        str(r.date): {"orders": int(r.orders or 0), "revenue": float(r.revenue or 0)}
        for r in paid_rows
    }

    quote_map = {}
    if include_quotes:
        quote_rows = (
            db.query(
                func.date(Order.created_at).label("date"),
                func.count(Order.id).label("quote_orders"),
                func.sum(_usd_total_expr()).label("quote_revenue"),
            )
            .filter(Order.created_at >= since, Order.created_at <= until, Order.is_quote.is_(True))
            .group_by(func.date(Order.created_at))
            .order_by(func.date(Order.created_at))
            .all()
        )
        quote_map = {
            str(r.date): {
                "quote_orders": int(r.quote_orders or 0),
                "quote_revenue": float(r.quote_revenue or 0),
            }
            for r in quote_rows
        }

    timeline = []
    for i in range(days_count):
        day = (start_day + timedelta(days=i)).strftime("%Y-%m-%d")
        paid_entry = paid_map.get(day, {"orders": 0, "revenue": 0.0})
        quote_entry = quote_map.get(day, {"quote_orders": 0, "quote_revenue": 0.0})
        timeline.append({"date": day, **paid_entry, **quote_entry})

    return {"days": days_count, "timeline": timeline}


@router.get("/stats/top-products")
def get_top_products(
    limit: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
):
    """Productos con más revenue (excluye cotizaciones — nunca se pagaron)."""
    date_range = _get_date_range(start_date, end_date)
    rows = (
        db.query(
            Product.id,
            Product.sku,
            Product.name,
            Product.brand,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.quantity * OrderItem.unit_price).label("revenue"),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.is_quote.isnot(True))
        .filter(
            *(  # date_range is optional
                [] if not date_range else [Order.created_at >= date_range[0], Order.created_at <= date_range[1]]
            )
        )
        .group_by(Product.id)
        .order_by(func.sum(OrderItem.quantity * OrderItem.unit_price).desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id":         r.id,
            "sku":        r.sku,
            "name":       r.name,
            "brand":      r.brand,
            "units_sold": int(r.units_sold or 0),
            "revenue":    float(r.revenue or 0),
        }
        for r in rows
    ]


@router.get("/stats/top-customers")
def get_top_customers(
    limit: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
):
    """Clientes con más gasto acumulado (excluye cotizaciones — nunca se pagaron)."""
    date_range = _get_date_range(start_date, end_date)
    usd_expr = _usd_total_expr()

    rows = (
        db.query(
            User.id,
            User.email,
            User.business_name,
            func.count(Order.id).label("order_count"),
            func.sum(usd_expr).label("total_spent_usd"),
        )
        .join(Order, Order.user_id == User.id)
        .filter(Order.is_quote.isnot(True))
        .filter(*(  # date_range is optional
            [] if not date_range else [Order.created_at >= date_range[0], Order.created_at <= date_range[1]]
        ))
        .group_by(User.id)
        .order_by(func.sum(usd_expr).desc())
        .limit(limit)
        .all()
    )

    tiers = _ensure_default_customer_spend_tiers(db)

    return [
        {
            "id":            r.id,
            "email":         r.email,
            "business_name": r.business_name,
            "order_count":   int(r.order_count or 0),
            "total_spent":   float(r.total_spent_usd or 0),
            "tier_name":     _select_tier_for_spent_usd(tiers, float(r.total_spent_usd or 0)).name,
            "tier_color":    _select_tier_for_spent_usd(tiers, float(r.total_spent_usd or 0)).color_hex,
        }
        for r in rows
    ]


# ─── Órdenes ──────────────────────────────────────────────────────────────────

@router.get("/orders", response_model=list[OrderOut])
def list_all_orders(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    return db.query(Order).order_by(Order.created_at.desc()).all()


@router.get("/orders/search", response_model=OrdersSearchOut)
def search_orders(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=30, ge=1, le=100),
    search: str = Query(default="", max_length=100),
    status: str = Query(default="all", max_length=40),
    is_quote: Optional[bool] = Query(default=None),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    date_range = _get_date_range(start_date, end_date)

    q = (
        db.query(Order)
        .options(joinedload(Order.user), selectinload(Order.items))
        .join(User, Order.user_id == User.id)
    )

    if status != "all" and status:
        try:
            status_enum = OrderStatus(status)
        except Exception:
            raise HTTPException(status_code=422, detail="status inválido")
        q = q.filter(Order.status == status_enum)

    if is_quote is True:
        q = q.filter(Order.is_quote.is_(True))
    elif is_quote is False:
        q = q.filter(Order.is_quote.isnot(True))

    if date_range:
        since, until = date_range
        q = q.filter(Order.created_at >= since, Order.created_at <= until)

    s = search.strip()
    if s:
        like = f"%{s}%"
        filters = [User.email.ilike(like), User.business_name.ilike(like)]
        if s.isdigit():
            filters.append(Order.id == int(s))
        q = q.filter(or_(*filters))

    total = q.count()
    items = (
        q.order_by(Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return OrdersSearchOut(items=items, total=total, page=page, page_size=page_size)


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

    try:
        email_service.send_order_status_email(
            order.client_email, order.id, order.status.value, float(order.total_amount)
        )
    except Exception:
        logger.exception("No se pudo enviar el correo de cambio de estado de la orden %s", order.id)

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
        total_spent  = float(db.query(func.sum(_usd_total_expr())).filter(Order.user_id == u.id).scalar() or 0)
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
            detail=(
                f"Producto con ID {ref.product_id} no encontrado en Icecat. "
                "Posibles causas: la marca no está en Open Icecat (requiere Full Icecat), "
                "credenciales ICECAT_USERNAME ausentes/incorrectas, o ID inexistente. "
                "Revisa los logs del backend para ver la respuesta exacta de la API."
            ),
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


# ─── Supplier (mayorista) ─────────────────────────────────────────────────────

from app.services.supplier import get_supplier_provider


@router.get("/supplier/products")
async def supplier_list(
    search: str = Query(default="", max_length=100),
    _=Depends(require_admin),
):
    """Lista productos del mayorista activo (default: mock)."""
    provider = get_supplier_provider()
    products = await provider.list_products(search)
    return {
        "provider": provider.name,
        "count":    len(products),
        "products": [p.to_dict() for p in products],
    }


class SupplierImportPreviewRequest(BaseModel):
    supplier_sku: str
    margin:       Optional[float] = None  # opcional: margen extra a aplicar al precio mayorista


@router.post("/products/import/from-supplier")
async def supplier_import_preview(
    payload: SupplierImportPreviewRequest,
    _=Depends(require_admin),
):
    """
    Preview combinado mayorista + Icecat:
      1. Trae el producto del mayorista (precio, nombre, stock, EAN).
      2. Si tiene EAN, intenta enriquecer con Icecat (specs, imagen, descripción).
      3. Devuelve un payload editable compatible con `/products/import/confirm`.
    """
    provider = get_supplier_provider()
    product  = await provider.get_product(payload.supplier_sku)
    if product is None:
        raise HTTPException(404, f"Producto {payload.supplier_sku} no encontrado en {provider.name}")

    enriched = None
    icecat_meta = {"used": False, "reason": "no_ean"}
    if product.ean:
        ic_provider = get_provider()
        try:
            raw = await ic_provider.fetch_by_ean(product.ean)
        except Exception as exc:
            logger.exception("Icecat lookup failed for EAN %s: %s", product.ean, exc)
            raw = None
        if raw is not None:
            enriched = map_to_internal(raw, source_url=f"icecat://ean/{product.ean}")
            icecat_meta = {"used": True, "ean": product.ean, "icecat_id": enriched.source_product_id}
        else:
            icecat_meta = {"used": False, "reason": "ean_not_found", "ean": product.ean}

    base_price = float(product.wholesale_price_usd)
    if payload.margin and payload.margin > 0:
        base_price = round(base_price * (1.0 + payload.margin), 2)

    suggested_sku = product.supplier_sku
    name          = enriched.name if enriched and enriched.name else product.name
    brand         = enriched.brand if enriched and enriched.brand else product.brand
    category      = enriched.category if enriched else (product.category or "servers")
    description   = enriched.description if enriched else (product.short_desc or product.name)
    image_url     = enriched.image_url if enriched and enriched.image_url else (product.image_url or "")
    specs         = enriched.technical_specs if enriched else {}
    raw_payload   = enriched.raw_source_payload if enriched else {}

    return {
        "supplier": {
            "provider": provider.name,
            "sku":      product.supplier_sku,
            "stock":    product.stock,
            "ean":      product.ean,
            "wholesale_price_usd": product.wholesale_price_usd,
        },
        "icecat":  icecat_meta,
        "preview": {
            "icecat_product_id":  enriched.source_product_id if enriched else "",
            "source_url":         enriched.source_url if enriched else "",
            "sku":                suggested_sku,
            "name":               name,
            "brand":              brand,
            "category":           category,
            "description":        description,
            "technical_specs":    specs,
            "image_url":          image_url,
            "base_price":         base_price,
            "stock_status":       "available" if product.stock > 0 else "on_request",
            "raw_source_payload": raw_payload,
        },
    }

