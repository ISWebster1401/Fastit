"""Tests del servicio de notificaciones de orden (sin SendGrid configurado en tests)."""
from app.services import email_service


class TestOrderStatusEmail:
    def test_returns_false_without_recipient(self):
        assert email_service.send_order_status_email("", 1, "Pending", 1000.0) is False

    def test_known_status_does_not_raise(self):
        for status in ["Pending", "Supplier_Ordered", "In_Transit_to_Nadilop", "Ready_to_Ship", "Shipped", "Delivered"]:
            email_service.send_order_status_email("cliente@test.cl", 42, status, 123456.0)

    def test_unknown_status_falls_back_gracefully(self):
        # No debe lanzar excepción aunque el status no esté en el mapeo de contenidos.
        email_service.send_order_status_email("cliente@test.cl", 42, "Quote_Requested", 123456.0)


class TestQuoteRequestEmail:
    def test_does_not_raise_without_sendgrid(self):
        email_service.send_quote_request_email("cliente@test.cl", 7, 500000.0)

    def test_notifies_sales_when_configured(self, monkeypatch):
        sent = []
        monkeypatch.setattr(email_service, "_send", lambda to, subject, html: sent.append(to) or True)
        monkeypatch.setattr(email_service.settings, "SALES_NOTIFICATION_EMAIL", "ventas@fastit.cl")
        email_service.send_quote_request_email("cliente@test.cl", 7, 500000.0)
        assert "cliente@test.cl" in sent
        assert "ventas@fastit.cl" in sent

    def test_skips_sales_notification_when_not_configured(self, monkeypatch):
        sent = []
        monkeypatch.setattr(email_service, "_send", lambda to, subject, html: sent.append(to) or True)
        monkeypatch.setattr(email_service.settings, "SALES_NOTIFICATION_EMAIL", "")
        email_service.send_quote_request_email("cliente@test.cl", 7, 500000.0)
        assert sent == ["cliente@test.cl"]
