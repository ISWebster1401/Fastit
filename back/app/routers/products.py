from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.product import Product
from app.schemas.product import ProductPublic, ProductDetail, ProductCreate
from app.services.pricing import calculate_public_price

router = APIRouter(prefix="/api/products", tags=["Products"])


@router.get("", response_model=list[ProductPublic])
def list_products(
    brand   : Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db      : Session       = Depends(get_db),
):
    query = db.query(Product)
    if brand:
        query = query.filter(Product.brand.ilike(f"%{brand}%"))
    if category:
        query = query.filter(Product.category.ilike(f"%{category}%"))
    return query.all()


@router.get("/{sku}", response_model=ProductDetail)
def get_product(sku: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.sku == sku).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Producto '{sku}' no encontrado")
    return product


@router.post("", response_model=ProductPublic, status_code=201)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    existing = db.query(Product).filter(Product.sku == payload.sku).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"SKU '{payload.sku}' ya existe")

    public_price = calculate_public_price(payload.base_price, payload.category)

    product = Product(
        **payload.model_dump(exclude={"base_price"}),
        base_price   = payload.base_price,
        public_price = public_price,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product
