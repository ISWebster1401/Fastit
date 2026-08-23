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


class TestCreateProduct:
    """POST /api/products — requiere admin (antes estaba sin auth, hueco de seguridad)."""

    def test_requires_auth(self, client):
        res = client.post("/api/products", json={
            "sku": "MANUAL-001", "name": "Producto manual", "brand": "GenBrand",
            "category": "servers", "base_price": 100.0,
        })
        assert res.status_code == 403

    def test_regular_user_cannot_create(self, client, user_token):
        res = client.post(
            "/api/products",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "sku": "MANUAL-001", "name": "Producto manual", "brand": "GenBrand",
                "category": "servers", "base_price": 100.0,
            },
        )
        assert res.status_code == 403

    def test_admin_can_create_manual_product(self, client, admin_token):
        res = client.post(
            "/api/products",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "sku": "MANUAL-001", "name": "Producto manual", "brand": "GenBrand",
                "category": "servers", "base_price": 100.0,
                "technical_specs": {"RAM": "32GB"}, "stock_status": "available",
            },
        )
        assert res.status_code == 201
        data = res.json()
        assert data["sku"] == "MANUAL-001"
        assert data["source"] == "manual"
        assert "base_price" not in data  # nunca se expone al cliente
        assert data["public_price"] == 118.0  # 100 * (1 + margen servers 18%)

    def test_duplicate_sku_rejected(self, client, admin_token, server_product):
        res = client.post(
            "/api/products",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "sku": server_product.sku, "name": "Duplicado", "brand": "X",
                "category": "servers", "base_price": 100.0,
            },
        )
        assert res.status_code == 409
