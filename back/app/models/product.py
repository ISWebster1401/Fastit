import enum
from sqlalchemy import Column, Integer, String, Numeric, JSON, Enum, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class StockStatus(str, enum.Enum):
    available    = "available"
    low_stock    = "low_stock"
    out_of_stock = "out_of_stock"
    on_request   = "on_request"


class Product(Base):
    __tablename__ = "products"

    id              = Column(Integer, primary_key=True, index=True)
    sku             = Column(String(64), unique=True, nullable=False, index=True)
    name            = Column(String(255), nullable=False)
    description     = Column(String, nullable=True)
    brand           = Column(String(100), nullable=False)
    category        = Column(String(100), nullable=False, index=True)
    technical_specs = Column(JSON, nullable=True)
    components      = Column(JSON, nullable=True)
    image_url       = Column(String(512), nullable=True)
    base_price      = Column(Numeric(12, 2), nullable=False)
    public_price    = Column(Numeric(12, 2), nullable=False)
    stock_status    = Column(Enum(StockStatus), default=StockStatus.on_request)

    # Trazabilidad de origen (manual | icecat | ...)
    source             = Column(String(20), server_default="manual", nullable=False)
    source_url         = Column(String(512), nullable=True)
    source_product_id  = Column(String(64),  nullable=True)
    source_synced_at   = Column(DateTime,    nullable=True)
    raw_source_payload = Column(JSON,        nullable=True)

    order_items = relationship("OrderItem", back_populates="product")
