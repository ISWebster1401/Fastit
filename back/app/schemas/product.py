from datetime import datetime
from pydantic import BaseModel, Field
from typing import Any, Optional
from app.models.product import StockStatus


class ProductBase(BaseModel):
    sku             : str               = Field(..., min_length=3, max_length=64)
    name            : str               = Field(..., min_length=3)
    description     : Optional[str]     = None
    brand           : str
    category        : str
    technical_specs : Optional[dict[str, Any]] = None
    components      : Optional[list[Any]]      = None
    image_url       : Optional[str]     = None
    stock_status    : StockStatus       = StockStatus.on_request


class ProductCreate(ProductBase):
    base_price: float = Field(..., gt=0)
    # public_price se calcula en el service


class ProductPublic(ProductBase):
    id          : int
    public_price: float
    source      : str = "manual"

    model_config = {"from_attributes": True}


class ProductDetail(ProductPublic):
    source_url        : Optional[str]      = None
    source_product_id : Optional[str]      = None
    source_synced_at  : Optional[datetime] = None


# ─── Icecat import ────────────────────────────────────────────────────────────

class IcecatPreviewOut(BaseModel):
    """Returned from POST /api/admin/products/import/preview."""
    icecat_product_id  : str
    source_url         : str
    sku                : str
    name               : str
    brand              : str
    category           : str
    description        : str
    technical_specs    : dict[str, Any]
    image_url          : str
    raw_source_payload : dict[str, Any]
    # price is 0 — must be filled by admin in the UI
    base_price         : float = 0.0
    stock_status       : StockStatus = StockStatus.on_request


class IcecatImportConfirm(BaseModel):
    """Sent to POST /api/admin/products/import/confirm."""
    icecat_product_id  : str
    source_url         : str
    sku                : str = Field(..., min_length=3, max_length=64)
    name               : str = Field(..., min_length=3)
    brand              : str
    category           : str
    description        : Optional[str] = None
    technical_specs    : Optional[dict[str, Any]] = None
    image_url          : Optional[str] = None
    base_price         : float = Field(..., gt=0)
    stock_status       : StockStatus = StockStatus.on_request
    raw_source_payload : Optional[dict[str, Any]] = None
    update_existing    : bool = False
