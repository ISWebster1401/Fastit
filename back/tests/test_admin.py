"""Tests del panel de administración — verifica control de acceso y funcionalidad."""


class TestAdminAuthorization:
    """Nadie sin token de admin puede acceder."""

    def test_stats_without_token_rejected(self, client):
        assert client.get("/api/admin/stats").status_code == 403

    def test_orders_without_token_rejected(self, client):
        assert client.get("/api/admin/orders").status_code == 403

    def test_update_status_without_token_rejected(self, client, pending_order):
        res = client.patch(
            f"/api/admin/orders/{pending_order.id}/status",
            json={"status": "Supplier_Ordered"},
        )
        assert res.status_code == 403

    def test_regular_user_cannot_access_stats(self, client, user_token):
        res = client.get(
            "/api/admin/stats",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert res.status_code == 403

    def test_regular_user_cannot_list_orders(self, client, user_token):
        res = client.get(
            "/api/admin/orders",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert res.status_code == 403

    def test_regular_user_cannot_update_status(self, client, user_token, pending_order):
        res = client.patch(
            f"/api/admin/orders/{pending_order.id}/status",
            json={"status": "Supplier_Ordered"},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert res.status_code == 403


class TestAdminStats:
    def test_stats_returns_correct_structure(self, client, admin_token):
        res = client.get(
            "/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert "total_orders" in data
        assert "total_revenue" in data
        assert "pending_count" in data
        assert "delivered_count" in data
        assert "by_status" in data

    def test_stats_with_no_orders(self, client, admin_token):
        res = client.get(
            "/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        data = res.json()
        assert data["total_orders"] == 0
        assert data["total_revenue"] == 0.0
        assert data["pending_count"] == 0

    def test_stats_counts_pending_order(self, client, admin_token, pending_order):
        res = client.get(
            "/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        data = res.json()
        assert data["total_orders"] == 1
        assert data["pending_count"] == 1
        assert data["total_revenue"] == float(pending_order.total_amount)


class TestAdminOrders:
    def test_list_all_orders(self, client, admin_token, pending_order):
        res = client.get(
            "/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        orders = res.json()
        assert len(orders) == 1

    def test_order_includes_client_info(self, client, admin_token, pending_order):
        res = client.get(
            "/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        order = res.json()[0]
        assert "client_name" in order
        assert "client_email" in order

    def test_order_includes_product_names(self, client, admin_token, pending_order):
        res = client.get(
            "/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        item = res.json()[0]["items"][0]
        assert "product_name" in item
        assert item["product_name"] is not None

    def test_empty_orders_list(self, client, admin_token):
        res = client.get(
            "/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.json() == []


class TestAdminUpdateStatus:
    def test_advance_status(self, client, admin_token, pending_order):
        res = client.patch(
            f"/api/admin/orders/{pending_order.id}/status",
            json={"status": "Supplier_Ordered"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        assert res.json()["status"] == "Supplier_Ordered"

    def test_full_status_flow(self, client, admin_token, pending_order):
        statuses = [
            "Supplier_Ordered", "In_Transit_to_Nadilop",
            "Ready_to_Ship", "Shipped", "Delivered",
        ]
        for status in statuses:
            res = client.patch(
                f"/api/admin/orders/{pending_order.id}/status",
                json={"status": status},
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert res.status_code == 200
            assert res.json()["status"] == status

    def test_update_nonexistent_order(self, client, admin_token):
        res = client.patch(
            "/api/admin/orders/99999/status",
            json={"status": "Delivered"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 404

    def test_invalid_status_rejected(self, client, admin_token, pending_order):
        res = client.patch(
            f"/api/admin/orders/{pending_order.id}/status",
            json={"status": "EstadoInvalido"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 422
