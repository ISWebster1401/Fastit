from decimal import Decimal, ROUND_HALF_UP
from app.core.config import settings


def calculate_public_price(base_price: float, category: str) -> float:
    """Aplica margen por categoría sobre el precio base mayorista."""
    margin = settings.CATEGORY_MARGINS.get(
        category.lower(),
        settings.CATEGORY_MARGINS["default"],
    )
    price = Decimal(str(base_price)) * (1 + Decimal(str(margin)))
    return float(price.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
