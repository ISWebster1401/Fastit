"""Tests de endpoints de productos."""


class TestListProducts:
    def test_empty_catalog(self, client):
        res = client.get("/api/products")
        assert res.status_code == 200
        assert res.json() == []

    def test_returns_products(self, client, server_product):
        res = client.get("/api/products")
        assert res.status_code == 200
        products = res.json()
        assert len(products) == 1
        assert products[0]["sku"] == server_product.sku

    def test_base_price_never_exposed(self, client, server_product):
        res = client.get("/api/products")
        product = res.json()[0]
        assert "base_price" not in product

    def test_public_price_is_exposed(self, client, server_product):
        res = client.get("/api/products")
        product = res.json()[0]
        assert "public_price" in product
        assert product["public_price"] == float(server_product.public_price)

    def test_filter_by_category(self, client, server_product, storage_product):
        res = client.get("/api/products?category=servers")
        products = res.json()
        assert len(products) == 1
        assert products[0]["category"] == "servers"

    def test_filter_by_brand(self, client, server_product, storage_product):
        res = client.get("/api/products?brand=HPE")
        products = res.json()
        assert all(p["brand"] == "HPE" for p in products)

    def test_filter_nonexistent_brand_returns_empty(self, client, server_product):
        res = client.get("/api/products?brand=MarcaQueNoExiste")
        assert res.json() == []


class TestGetProductBySku:
    def test_get_existing_product(self, client, server_product):
        res = client.get(f"/api/products/{server_product.sku}")
        assert res.status_code == 200
        data = res.json()
        assert data["sku"] == server_product.sku
        assert data["name"] == server_product.name
        assert "technical_specs" in data

    def test_get_nonexistent_sku_returns_404(self, client):
        res = client.get("/api/products/SKU-NO-EXISTE-99999")
        assert res.status_code == 404

    def test_product_includes_stock_status(self, client, server_product):
        res = client.get(f"/api/products/{server_product.sku}")
        assert "stock_status" in res.json()
        assert res.json()["stock_status"] == "available"
