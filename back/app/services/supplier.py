"""
Abstracción de mayoristas (Ingram Micro, Intcomex, etc.).

Sigue la misma arquitectura provider/factory que `icecat_service.py`:
- ABC `SupplierProvider` con la interfaz pública.
- `MockSupplierProvider` con catálogo realista para desarrollo.
- `IngramMicroProvider` placeholder (estructura de auth lista, sin fetch real).
- `get_supplier_provider()` selecciona según env `SUPPLIER_PROVIDER` (default: `mock`).

El singleton `supplier_service` se mantiene para compatibilidad con el flujo
actual de pagos (crear orden de compra al confirmar pago).
"""
from __future__ import annotations

import logging
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict, field
from typing import List, Optional

logger = logging.getLogger(__name__)


@dataclass
class SupplierProduct:
    """Representación normalizada de un producto en catálogo de mayorista."""

    supplier_sku:        str
    name:                str
    brand:               str
    wholesale_price_usd: float
    stock:               int
    ean:                 Optional[str] = None
    category:            Optional[str] = None
    short_desc:          Optional[str] = None
    image_url:           Optional[str] = None
    extra:               dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


class SupplierProvider(ABC):
    """Interfaz común que cualquier mayorista debe implementar."""

    name: str = "abstract"

    @abstractmethod
    async def list_products(self, search: str = "") -> List[SupplierProduct]:
        ...

    @abstractmethod
    async def get_product(self, supplier_sku: str) -> Optional[SupplierProduct]:
        ...

    @abstractmethod
    async def get_stock(self, supplier_sku: str) -> Optional[int]:
        ...

    @abstractmethod
    async def create_purchase_order(self, order_id: int, items: list[dict]) -> str:
        ...


class MockSupplierProvider(SupplierProvider):
    """
    Catálogo simulado lo bastante realista para que la UI tenga sentido y
    el combo con Icecat (EAN) sea probable. Las marcas que aparecen en
    Open Icecat (HPE, Dell, NetApp, Cisco, Lenovo) están aquí con EAN
    plausible para que el enriquecimiento se pueda demostrar.
    """

    name = "mock"

    _CATALOG: List[SupplierProduct] = [
        SupplierProduct(
            supplier_sku="MAY-HPE-DL380G10P",
            name="HPE ProLiant DL380 Gen10 Plus",
            brand="HPE",
            wholesale_price_usd=4900.00,
            stock=8,
            ean="0190017512457",
            category="servers",
            short_desc="Servidor rack 2U Intel Xeon Scalable Gen3",
        ),
        SupplierProduct(
            supplier_sku="MAY-HPE-MSA2060",
            name="HPE MSA 2060 SAS 12G",
            brand="HPE",
            wholesale_price_usd=3550.00,
            stock=3,
            ean="0190017604322",
            category="storage",
            short_desc="Storage SAN/DAS de entrada con 24 bahías SFF",
        ),
        SupplierProduct(
            supplier_sku="MAY-DELL-R750",
            name="Dell PowerEdge R750",
            brand="Dell",
            wholesale_price_usd=6800.00,
            stock=5,
            ean="0884116410010",
            category="servers",
            short_desc="Servidor rack 2U para virtualización y bases de datos",
        ),
        SupplierProduct(
            supplier_sku="MAY-DELL-R750XA",
            name="Dell PowerEdge R750xa (8 GPU)",
            brand="Dell",
            wholesale_price_usd=13800.00,
            stock=2,
            ean="0884116415789",
            category="servers",
            short_desc="Servidor 2U IA/ML con soporte hasta 8 GPUs PCIe Gen4",
        ),
        SupplierProduct(
            supplier_sku="MAY-CISCO-9300-48P",
            name="Cisco Catalyst 9300 48-Port PoE+",
            brand="Cisco",
            wholesale_price_usd=3850.00,
            stock=12,
            ean="0889728107945",
            category="networking",
            short_desc="Switch L3 48× 1GbE PoE+ con uplinks 10G",
        ),
        SupplierProduct(
            supplier_sku="MAY-CISCO-9200-24P",
            name="Cisco Catalyst 9200L 24-Port PoE+",
            brand="Cisco",
            wholesale_price_usd=2150.00,
            stock=18,
            ean="0889728207430",
            category="networking",
            short_desc="Switch enterprise 24× 1GbE PoE+ con uplinks 10G",
        ),
        SupplierProduct(
            supplier_sku="MAY-LENOVO-SR650V3",
            name="Lenovo ThinkSystem SR650 V3",
            brand="Lenovo",
            wholesale_price_usd=5400.00,
            stock=4,
            ean="0195042512889",
            category="servers",
            short_desc="Servidor rack 2U Xeon Scalable Gen4",
        ),
        SupplierProduct(
            supplier_sku="MAY-LENOVO-SR250V3",
            name="Lenovo ThinkSystem SR250 V3",
            brand="Lenovo",
            wholesale_price_usd=1900.00,
            stock=10,
            ean="0195042513572",
            category="servers",
            short_desc="Servidor rack 1U entry-level Intel Xeon E",
        ),
        SupplierProduct(
            supplier_sku="MAY-NETAPP-AFFA250",
            name="NetApp AFF A250",
            brand="NetApp",
            wholesale_price_usd=17200.00,
            stock=1,
            ean="0886111234567",
            category="storage",
            short_desc="Array all-flash NVMe ONTAP para cargas críticas",
        ),
        SupplierProduct(
            supplier_sku="MAY-NETAPP-FAS2820",
            name="NetApp FAS2820",
            brand="NetApp",
            wholesale_price_usd=12500.00,
            stock=2,
            ean="0886111245678",
            category="storage",
            short_desc="Storage híbrido SSD + HDD con ONTAP 9",
        ),
        SupplierProduct(
            supplier_sku="MAY-HPE-ARUBA-2930F",
            name="HPE Aruba 2930F 48G PoE+",
            brand="HPE",
            wholesale_price_usd=1850.00,
            stock=15,
            ean="0190017218472",
            category="networking",
            short_desc="Switch L3 lite 48× 1GbE PoE+ para campus",
        ),
        SupplierProduct(
            supplier_sku="MAY-DELL-PREC-7960",
            name="Dell Precision 7960 Tower",
            brand="Dell",
            wholesale_price_usd=3650.00,
            stock=6,
            ean="0884116498123",
            category="workstations",
            short_desc="Workstation Xeon W con GPU profesional NVIDIA RTX",
        ),
        SupplierProduct(
            supplier_sku="MAY-SAMSUNG-980P-2T",
            name="Samsung 980 Pro NVMe 2TB",
            brand="Samsung",
            wholesale_price_usd=160.00,
            stock=80,
            ean="8806090874130",
            category="storage",
            short_desc="SSD NVMe Gen4 PCIe 4.0 de alto rendimiento",
        ),
        SupplierProduct(
            supplier_sku="MAY-SEAGATE-IRONWOLF-8T",
            name="Seagate IronWolf Pro 8TB",
            brand="Seagate",
            wholesale_price_usd=210.00,
            stock=45,
            ean="0763649148051",
            category="storage",
            short_desc="HDD NAS/Workstation 24/7 a 7200 RPM",
        ),
    ]

    def _filter(self, search: str) -> List[SupplierProduct]:
        if not search:
            return list(self._CATALOG)
        q = search.lower().strip()
        return [
            p for p in self._CATALOG
            if q in p.name.lower()
            or q in p.brand.lower()
            or q in p.supplier_sku.lower()
            or (p.ean and q in p.ean)
        ]

    async def list_products(self, search: str = "") -> List[SupplierProduct]:
        return self._filter(search)

    async def get_product(self, supplier_sku: str) -> Optional[SupplierProduct]:
        for p in self._CATALOG:
            if p.supplier_sku == supplier_sku:
                return p
        return None

    async def get_stock(self, supplier_sku: str) -> Optional[int]:
        p = await self.get_product(supplier_sku)
        return p.stock if p else None

    async def create_purchase_order(self, order_id: int, items: list[dict]) -> str:
        supplier_ref = f"MOCK-PO-{order_id:06d}"
        logger.info("[SupplierMock] PO %s items=%s", supplier_ref, items)
        return supplier_ref


class IngramMicroProvider(SupplierProvider):
    """
    Placeholder con la estructura de auth de Ingram Micro Reseller API v6.
    Endpoints comentados — completar cuando se tenga acceso productivo.

    Headers requeridos por Ingram:
      - xMP-Token:    OAuth2 bearer token (refresh cada hora)
      - xMP-Username: usuario reseller
    """

    name = "ingram"

    BASE_URL = "https://api.ingrammicro.com/resellers/v6"

    def __init__(self, token: str = "", username: str = ""):
        self.token = token or os.getenv("INGRAM_TOKEN", "")
        self.username = username or os.getenv("INGRAM_USERNAME", "")

    def _headers(self) -> dict:
        return {
            "xMP-Token":    self.token,
            "xMP-Username": self.username,
            "Accept":       "application/json",
        }

    async def list_products(self, search: str = "") -> List[SupplierProduct]:
        # TODO: GET {BASE_URL}/catalog?keyword={search}
        logger.warning("IngramMicroProvider.list_products no implementado")
        return []

    async def get_product(self, supplier_sku: str) -> Optional[SupplierProduct]:
        # TODO: GET {BASE_URL}/catalog/{supplier_sku}
        logger.warning("IngramMicroProvider.get_product no implementado")
        return None

    async def get_stock(self, supplier_sku: str) -> Optional[int]:
        # TODO: GET {BASE_URL}/catalog/{supplier_sku}/availability
        logger.warning("IngramMicroProvider.get_stock no implementado")
        return None

    async def create_purchase_order(self, order_id: int, items: list[dict]) -> str:
        # TODO: POST {BASE_URL}/orders
        logger.warning("IngramMicroProvider.create_purchase_order no implementado")
        return f"INGRAM-PO-{order_id:06d}"


def get_supplier_provider() -> SupplierProvider:
    """Selecciona el provider según `SUPPLIER_PROVIDER` (default: mock)."""
    name = (os.getenv("SUPPLIER_PROVIDER") or "mock").strip().lower()
    if name == "ingram":
        return IngramMicroProvider()
    return MockSupplierProvider()


# Compatibilidad hacia atrás: el flujo de pago usa supplier_service.create_purchase_order().
class _SupplierServiceFacade:
    """Facade que delega al provider activo, manteniendo la API antigua."""

    def _provider(self) -> SupplierProvider:
        return get_supplier_provider()

    async def get_stock(self, sku: str):
        return await self._provider().get_stock(sku)

    async def create_purchase_order(self, order_id: int, items: list[dict]) -> str:
        return await self._provider().create_purchase_order(order_id, items)


supplier_service = _SupplierServiceFacade()
