import enum
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class OrderStatus(str, enum.Enum):
    pending               = "Pending"
    supplier_ordered      = "Supplier_Ordered"
    in_transit_to_nadilop = "In_Transit_to_Nadilop"
    ready_to_ship         = "Ready_to_Ship"
    shipped               = "Shipped"
    delivered             = "Delivered"


class DocumentType(str, enum.Enum):
    boleta  = "Boleta"
    factura = "Factura"


class Order(Base):
    __tablename__ = "orders"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_amount  = Column(Numeric(12, 2), nullable=False)
    status        = Column(Enum(OrderStatus), default=OrderStatus.pending)
    document_type = Column(Enum(DocumentType), nullable=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    # Snapshot de datos de factura al momento de la compra
    invoice_rut               = Column(String(20), nullable=True)
    invoice_business_name     = Column(String(255), nullable=True)
    invoice_business_activity = Column(String(255), nullable=True)

    # Snapshot de datos de boleta (persona natural) al momento de la compra
    boleta_full_name = Column(String(255), nullable=True)
    boleta_rut       = Column(String(20),  nullable=True)
    boleta_email     = Column(String(255), nullable=True)

    # Tipo de cambio aplicado (USD → CLP) al momento de generar la orden
    exchange_rate_used = Column(Numeric(10, 2), nullable=True)

    # Envío Chilexpress
    shipping_address = Column(String(255), nullable=True)
    shipping_commune = Column(String(100), nullable=True)
    shipping_region  = Column(String(100), nullable=True)
    shipping_cost    = Column(Numeric(10, 2), nullable=True, default=0)

    user  = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    @property
    def client_name(self) -> str:
        if not self.user:
            return f"Usuario #{self.user_id}"
        return self.user.business_name or self.user.email

    @property
    def client_email(self) -> str:
        return self.user.email if self.user else ""


class OrderItem(Base):
    __tablename__ = "order_items"

    id         = Column(Integer, primary_key=True, index=True)
    order_id   = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity   = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)

    order   = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

    @property
    def product_name(self) -> str:
        return self.product.name if self.product else f"Producto #{self.product_id}"

    @property
    def product_sku(self) -> str:
        return self.product.sku if self.product else ""
