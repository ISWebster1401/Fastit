"""
Abstracción para integración futura con mayoristas (Ingram Micro, Intcomex).
En MVP retorna datos simulados. Reemplazar cada método con la llamada HTTP real.
"""
from typing import Optional


class SupplierService:
    async def get_stock(self, sku: str) -> Optional[str]:
        """Retorna stock_status desde el mayorista."""
        # TODO: GET https://api.ingrammicro.com/resellers/v6/catalog/{sku}
        return "available"

    async def create_purchase_order(self, order_id: int, items: list[dict]) -> str:
        """
        Genera una orden de compra al mayorista con despacho a bodegas NADILOP.
        Retorna el ID de la orden en el sistema del mayorista.
        """
        # TODO: POST https://api.ingrammicro.com/resellers/v6/orders
        supplier_ref = f"NADILOP-PO-{order_id:06d}"
        print(f"[SUPPLIER] Orden de compra generada: {supplier_ref} | Items: {items}")
        return supplier_ref


supplier_service = SupplierService()
