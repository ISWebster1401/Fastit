"""Tests unitarios del servicio de pricing."""
import pytest
from app.services.pricing import calculate_public_price


class TestCategoryMargins:
    def test_storage_22_percent(self):
        assert calculate_public_price(1000.0, "storage") == 1220.00

    def test_servers_18_percent(self):
        assert calculate_public_price(1000.0, "servers") == 1180.00

    def test_networking_20_percent(self):
        assert calculate_public_price(1000.0, "networking") == 1200.00

    def test_accessories_30_percent(self):
        assert calculate_public_price(1000.0, "accessories") == 1300.00

    def test_unknown_category_uses_25_percent_default(self):
        assert calculate_public_price(1000.0, "categoria_desconocida") == 1250.00

    def test_uppercase_category_normalized(self):
        # La función aplica .lower() → "STORAGE" → 22% igual que "storage"
        result = calculate_public_price(1000.0, "STORAGE")
        assert result == 1220.00


class TestPrecision:
    def test_rounds_to_two_decimals(self):
        result = calculate_public_price(333.33, "servers")
        # 333.33 * 1.18 = 393.3294 → 393.33
        assert result == 393.33

    def test_zero_base_price(self):
        assert calculate_public_price(0.0, "servers") == 0.00

    def test_returns_float(self):
        result = calculate_public_price(1000.0, "storage")
        assert isinstance(result, float)

    def test_large_price(self):
        result = calculate_public_price(100_000.0, "servers")
        assert result == 118_000.00

    @pytest.mark.parametrize("base,category,expected", [
        (5200.0,  "servers",    6136.00),
        (3800.0,  "storage",    4636.00),
        (4100.0,  "networking", 4920.00),
        (14500.0, "servers",   17110.00),
        (18000.0, "storage",   21960.00),
    ])
    def test_real_catalog_prices(self, base, category, expected):
        assert calculate_public_price(base, category) == expected
