from sqlalchemy import Column, Integer, String, Numeric

from app.database import Base


class CustomerSpendTier(Base):
    __tablename__ = "customer_spend_tiers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)

    # Umbral mínimo de gasto acumulado (USD) para pertenecer al tier.
    min_spent_usd = Column(Numeric(14, 2), nullable=False, default=0)

    # Color hex para badge visual en el dashboard.
    color_hex = Column(String(20), nullable=False, default="#94a3b8")

    display_order = Column(Integer, nullable=False, default=0)

