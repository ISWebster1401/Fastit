"""Tests del flujo de checkout y creación de órdenes."""


class TestCheckoutBoleta:
    def test_checkout_boleta_success(self, client, regular_user, server_product):
        res = client.post("/api/checkout", json={
            "user_id": regular_user.id,
            "document_type": "Boleta",
            "items": [{"product_id": server_product.id, "quantity": 1}],
        })
        assert res.status_code == 201
        data = res.json()
        assert data["status"] == "Pending"
        assert data["document_type"] == "Boleta"
        assert data["user_id"] == regular_user.id

    def test_checkout_calculates_total_correctly(self, client, regular_user, server_product):
        qty = 3
        res = client.post("/api/checkout", json={
            "user_id": regular_user.id,
            "document_type": "Boleta",
            "items": [{"product_id": server_product.id, "quantity": qty}],
        })
        assert res.status_code == 201
        expected = float(server_product.public_price) * qty
        assert float(res.json()["total_amount"]) == expected

    def test_checkout_creates_order_items(self, client, regular_user, server_product):
        res = client.post("/api/checkout", json={
            "user_id": regular_user.id,
            "document_type": "Boleta",
            "items": [{"product_id": server_product.id, "quantity": 2}],
        })
        assert res.status_code == 201
        items = res.json()["items"]
        assert len(items) == 1
        assert items[0]["quantity"] == 2
        assert items[0]["product_id"] == server_product.id

    def test_checkout_snapshots_unit_price(self, client, regular_user, server_product):
        res = client.post("/api/checkout", json={
            "user_id": regular_user.id,
            "document_type": "Boleta",
            "items": [{"product_id": server_product.id, "quantity": 1}],
        })
        assert res.status_code == 201
        # unit_price debe ser el precio del producto en el momento de compra
        assert float(res.json()["items"][0]["unit_price"]) == float(server_product.public_price)

    def test_checkout_multiple_products(self, client, regular_user, server_product, storage_product):
        res = client.post("/api/checkout", json={
            "user_id": regular_user.id,
            "document_type": "Boleta",
            "items": [
                {"product_id": server_product.id,  "quantity": 1},
                {"product_id": storage_product.id, "quantity": 2},
            ],
        })
        assert res.status_code == 201
        assert len(res.json()["items"]) == 2


class TestCheckoutFactura:
    def test_factura_requires_rut(self, client, regular_user, server_product):
        res = client.post("/api/checkout", json={
            "user_id": regular_user.id,
            "document_type": "Factura",
            "items": [{"product_id": server_product.id, "quantity": 1}],
            # Falta invoice_rut, invoice_business_name, invoice_business_activity
        })
        assert res.status_code == 422

    def test_factura_partial_fields_fails(self, client, regular_user, server_product):
        res = client.post("/api/checkout", json={
            "user_id": regular_user.id,
            "document_type": "Factura",
            "items": [{"product_id": server_product.id, "quantity": 1}],
            "invoice_rut": "76.123.456-7",
            # Falta business_name y business_activity
        })
        assert res.status_code == 422

    def test_factura_complete_fields_success(self, client, regular_user, server_product):
        res = client.post("/api/checkout", json={
            "user_id": regular_user.id,
            "document_type": "Factura",
            "items": [{"product_id": server_product.id, "quantity": 1}],
            "invoice_rut": "76.123.456-7",
            "invoice_business_name": "Empresa Test SpA",
            "invoice_business_activity": "Tecnología",
        })
        assert res.status_code == 201
        data = res.json()
        assert data["document_type"] == "Factura"
        assert data["invoice_rut"] == "76.123.456-7"
        assert data["invoice_business_name"] == "Empresa Test SpA"


class TestCheckoutValidation:
    def test_empty_cart_rejected(self, client, regular_user):
        res = client.post("/api/checkout", json={
            "user_id": regular_user.id,
            "document_type": "Boleta",
            "items": [],
        })
        assert res.status_code == 422

    def test_quantity_zero_rejected(self, client, regular_user, server_product):
        res = client.post("/api/checkout", json={
            "user_id": regular_user.id,
            "document_type": "Boleta",
            "items": [{"product_id": server_product.id, "quantity": 0}],
        })
        assert res.status_code == 422

    def test_invalid_document_type_rejected(self, client, regular_user, server_product):
        res = client.post("/api/checkout", json={
            "user_id": regular_user.id,
            "document_type": "TipoInvalido",
            "items": [{"product_id": server_product.id, "quantity": 1}],
        })
        assert res.status_code == 422
