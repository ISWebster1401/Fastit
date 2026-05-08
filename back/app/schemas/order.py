from pydantic import BaseModel, Field, model_validator
from typing import Optional
from datetime import datetime
from app.models.order import OrderStatus, DocumentType


class OrderItemIn(BaseModel):
    product_id: int
    quantity  : int = Field(..., ge=1)


class OrderItemOut(BaseModel):
    product_id  : int
    quantity    : int
    unit_price  : float
    product_name: Optional[str] = None
    product_sku : Optional[str] = None

    model_config = {"from_attributes": True}


class CheckoutRequest(BaseModel):
    items        : list[OrderItemIn] = Field(..., min_length=1)
    document_type: DocumentType

    invoice_rut              : Optional[str] = None
    invoice_business_name    : Optional[str] = None
    invoice_business_activity: Optional[str] = None

    boleta_full_name: Optional[str] = None
    boleta_rut      : Optional[str] = None
    boleta_email    : Optional[str] = None

    @model_validator(mode="after")
    def validate_document_fields(self):
        if self.document_type == DocumentType.factura:
            missing = [
                label for label, val in {
                    "RUT"         : self.invoice_rut,
                    "Razón Social": self.invoice_business_name,
                    "Giro"        : self.invoice_business_activity,
                }.items() if not val
            ]
            if missing:
                raise ValueError(f"Factura requiere: {', '.join(missing)}")

        if self.document_type == DocumentType.boleta:
            missing = [
                label for label, val in {
                    "Nombre completo": self.boleta_full_name,
                    "RUT"            : self.boleta_rut,
                    "Email"          : self.boleta_email,
                }.items() if not val
            ]
            if missing:
                raise ValueError(f"Boleta requiere: {', '.join(missing)}")
        return self


class OrderOut(BaseModel):
    id                       : int
    user_id                  : int
    total_amount             : float
    status                   : OrderStatus
    document_type            : DocumentType
    created_at               : Optional[datetime] = None
    invoice_rut              : Optional[str] = None
    invoice_business_name    : Optional[str] = None
    invoice_business_activity: Optional[str] = None
    boleta_full_name         : Optional[str] = None
    boleta_rut               : Optional[str] = None
    boleta_email             : Optional[str] = None
    exchange_rate_used       : Optional[float] = None
    client_name              : Optional[str] = None
    client_email             : Optional[str] = None
    items                    : list[OrderItemOut] = []

    model_config = {"from_attributes": True}


class PaymentWebhookPayload(BaseModel):
    order_id      : int
    payment_status: str
    transaction_id: str
