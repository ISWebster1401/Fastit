import enum
from sqlalchemy import Column, Integer, String, Numeric, JSON, Enum
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
    components      = Column(JSON, nullable=True)   # lista de componentes para workstations
    base_price      = Column(Numeric(12, 2), nullable=False)
    public_price    = Column(Numeric(12, 2), nullable=False)
    stock_status    = Column(Enum(StockStatus), default=StockStatus.on_request)

    order_items = relationship("OrderItem", back_populates="product")
