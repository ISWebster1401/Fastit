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
    stock_status    : StockStatus       = StockStatus.on_request


class ProductCreate(ProductBase):
    base_price: float = Field(..., gt=0)
    # public_price se calcula en el service, no se recibe del exterior


class ProductPublic(ProductBase):
    id          : int
    public_price: float

    model_config = {"from_attributes": True}


class ProductDetail(ProductPublic):
    pass
