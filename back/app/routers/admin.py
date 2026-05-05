from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.order import Order, OrderItem, OrderStatus
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
