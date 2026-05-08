"""
Icecat product import service.

Architecture: provider/adapter pattern.
- IcecatProvider (ABC): interface for any data source
- OpenIcecatProvider: uses icecat.biz REST API (requires ICECAT_USERNAME + ICECAT_PASSWORD)
- MockIcecatProvider: realistic mock used when credentials are absent

Usage:
    from app.services.icecat_service import get_provider, parse_icecat_url, map_to_internal

    ref    = parse_icecat_url("https://icecat.biz/p/hpe-proliant-83791490.html")
    raw    = await get_provider().fetch(ref.product_id)
    mapped = map_to_internal(raw, ref.source_url)

Environment variables:
    ICECAT_USERNAME  — icecat.biz account username (enables real API)
    ICECAT_PASSWORD  — icecat.biz password (optional, some endpoints accept empty)
"""

import logging
import os
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# ─── Category normalisation ───────────────────────────────────────────────────

_CATEGORY_MAP: dict[str, str] = {
    "servers":          "servers",
    "server":           "servers",
    "rack servers":     "servers",
    "blade servers":    "servers",
    "tower servers":    "servers",
    "workstations":     "workstations",
    "workstation":      "workstations",
    "desktop pcs":      "workstations",
    "network switches": "networking",
    "switches":         "networking",
    "routers":          "networking",
    "wireless":         "networking",
    "networking":       "networking",
    "storage":          "storage",
    "nas":              "storage",
    "san":              "storage",
    "disk arrays":      "storage",
    "tape drives":      "storage",
    "hard drives":      "storage",
    "accessories":      "accessories",
}

_VALID_INTERNAL_CATEGORIES = {"servers", "storage", "networking", "workstations", "accessories"}


def _normalise_category(icecat_name: str) -> str:
    key = icecat_name.lower().strip()
    if key in _CATEGORY_MAP:
        return _CATEGORY_MAP[key]
    for k, v in _CATEGORY_MAP.items():
        if k in key:
            return v
    return "servers"


# ─── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class ParsedIcecatRef:
    product_id: str
    source_url: str


@dataclass
class RawIcecatProduct:
    product_id:    str
    title:         str
    brand:         str
    short_desc:    str
    long_desc:     str
    image_url:     str
    category_name: str
    specs:         dict[str, str]
    raw:           dict  # full original payload for storage


@dataclass
class ProductImportData:
    sku:               str
    name:              str
    brand:             str
    category:          str
    description:       str
    technical_specs:   dict[str, str]
    image_url:         str
    source_product_id: str
    source_url:        str
    raw_source_payload: dict


# ─── URL parser ───────────────────────────────────────────────────────────────

def parse_icecat_url(url: str) -> ParsedIcecatRef:
    """
    Extract the Icecat product ID from any Icecat URL format.

    Supported patterns:
      https://icecat.biz/p/brand-model-123456.html
      https://icecat.us/p/brand-model-123456.html
      https://icecat.biz/product/search/123456
      https://icecat.biz/api/products/123456
      123456  (bare numeric ID)
    """
    url = url.strip()

    # bare numeric ID
    if url.isdigit():
        return ParsedIcecatRef(product_id=url, source_url=f"https://icecat.biz/api/products/{url}")

    # extract trailing numeric segment
    match = re.search(r'[-/](\d{4,})(?:\.html)?$', url)
    if match:
        return ParsedIcecatRef(product_id=match.group(1), source_url=url)

    # last path segment is purely numeric
    path = url.rstrip('/').split('?')[0]
    last = path.split('/')[-1].split('.')[0]
    if last.isdigit():
        return ParsedIcecatRef(product_id=last, source_url=url)

    raise ValueError(
        f"No se pudo extraer un ID de producto de Icecat desde la URL: {url!r}. "
        "Formatos válidos: https://icecat.biz/p/brand-model-<ID>.html  o  el ID numérico directamente."
    )


# ─── Internal helpers ─────────────────────────────────────────────────────────

def _extract_specs(features_groups: list) -> dict[str, str]:
    """Flatten FeaturesGroups → {feature_name: value_with_unit}."""
    specs: dict[str, str] = {}
    for group in features_groups:
        for feat in group.get("Features", []):
            name  = feat.get("Feature", {}).get("Name", "").strip()
            value = feat.get("LocalValue", {}).get("_", "").strip()
            if name and value:
                # append unit if present
                signs = (
                    feat.get("Measure", {})
                    .get("Signs", {})
                    .get("Sign", [])
                )
                unit = signs[0].get("_", "") if signs else ""
                specs[name] = f"{value} {unit}".strip() if unit else value
    return specs


def _parse_icecat_json(payload: dict, product_id: str) -> Optional[RawIcecatProduct]:
    """
    Parse an Icecat response dict into RawIcecatProduct.
    Supports two shapes:
      A) Icecat LIVE JSON: { "msg": "OK", "data": { "GeneralInfo": {...}, "Image": {...}, "FeaturesGroups": [...] } }
      B) Flat / mock shape: { "Title": "...", "Brand": "...", "FeaturesGroups": [...] }
    """
    if not payload:
        return None

    if isinstance(payload, dict) and payload.get("msg") and payload.get("msg") != "OK":
        return None

    data = payload.get("data") or payload
    if not data or data.get("ErrorMessage"):
        return None

    general = data.get("GeneralInfo") or {}
    image   = data.get("Image") or {}

    if general:
        title = (
            general.get("Title")
            or general.get("ProductName")
            or ""
        )
        brand_obj   = general.get("Brand") or general.get("BrandName") or ""
        brand_name  = brand_obj.get("Value") if isinstance(brand_obj, dict) else brand_obj
        description = general.get("Description") or {}
        short_desc  = (
            description.get("ShortDesc") if isinstance(description, dict) else ""
        ) or general.get("ShortDesc", "")
        long_desc   = (
            description.get("LongDesc") if isinstance(description, dict) else ""
        ) or general.get("LongDesc", short_desc)
        category_obj = general.get("Category") or {}
        category_nm_obj = category_obj.get("Name") if isinstance(category_obj, dict) else None
        category_name = (
            category_nm_obj.get("Value") if isinstance(category_nm_obj, dict) else category_nm_obj
        ) or "servers"
        image_url = (
            (image.get("HighPic") if isinstance(image, dict) else "")
            or general.get("HighPicURL", "")
        )
        product_id_val = str(general.get("IcecatId") or general.get("ProductID") or product_id)
    else:
        title          = data.get("Title", "")
        brand_name     = data.get("Brand", "")
        short_desc     = data.get("ShortDesc", "")
        long_desc      = data.get("LongDesc", short_desc)
        category_obj   = data.get("Category") or {}
        category_name  = (category_obj.get("Name") if isinstance(category_obj, dict) else category_obj) or "servers"
        image_url      = data.get("HighPicURL") or data.get("HighPic") or ""
        product_id_val = str(data.get("ProductID", product_id))

    specs = _extract_specs(data.get("FeaturesGroups", []))

    return RawIcecatProduct(
        product_id    = product_id_val,
        title         = (title or "").strip(),
        brand         = (brand_name or "").strip(),
        short_desc    = (short_desc or "").strip(),
        long_desc     = (long_desc or short_desc or title or "").strip(),
        image_url     = (image_url or "").strip(),
        category_name = category_name,
        specs         = specs,
        raw           = payload,
    )


def _suggest_sku(brand: str, product_id: str) -> str:
    """Generate a SKU suggestion from brand + Icecat product ID."""
    safe_brand = re.sub(r'[^A-Z0-9]', '', brand.upper())[:8]
    return f"{safe_brand}-IC{product_id}" if safe_brand else f"IC-{product_id}"


# Etiquetas típicas en inglés (Icecat LIVE) → español para el catálogo Fast-IT
_SPEC_LABEL_EN_TO_ES: dict[str, str] = {
    "Form Factor": "Factor de forma",
    "Processor family": "Familia del procesador",
    "Processor cores": "Núcleos del procesador",
    "Processor frequency": "Frecuencia del procesador",
    "Processor": "Procesador",
    "Max RAM": "RAM máxima",
    "Storage Bays": "Bahías de almacenamiento",
    "RAID controller": "Controlador RAID",
    "Network": "Red",
    "Power supply": "Fuente de alimentación",
    "Power supply type": "Tipo de fuente",
    "Ports": "Puertos",
    "PoE": "PoE",
    "PoE Budget": "Presupuesto PoE",
    "Switching capacity": "Capacidad de conmutación",
    "Layer": "Capa",
    "Uplinks": "Enlaces ascendentes",
    "Drive Bays": "Bahías de discos",
    "Interface": "Interfaz",
    "Type": "Tipo",
    "Cache": "Caché",
    "Controllers": "Controladores",
    "GPU Slots": "Ranuras GPU",
    "Storage": "Almacenamiento",
    "Max Capacity": "Capacidad máxima",
    "Max Raw Capacity": "Capacidad bruta máxima",
    "Latency": "Latencia",
    "Protocol": "Protocolo",
    "Software": "Software",
    "Features": "Características",
}


def _localize_technical_specs(specs: dict[str, str]) -> dict[str, str]:
    """Convierte claves (y algunos valores) típicos de Icecat al español."""
    out: dict[str, str] = {}
    for k, v in specs.items():
        nk = _SPEC_LABEL_EN_TO_ES.get(k.strip(), k)
        nv = v
        if isinstance(v, str):
            t = v.strip()
            if t in ("Yes", "yes"):
                nv = "Sí"
            elif t in ("No", "no"):
                nv = "No"
        out[nk] = nv
    return out


# ─── Mapping ──────────────────────────────────────────────────────────────────

def map_to_internal(raw: RawIcecatProduct, source_url: str) -> ProductImportData:
    """Convert a RawIcecatProduct into our internal ProductImportData."""
    desc = raw.long_desc or raw.short_desc or raw.title
    return ProductImportData(
        sku               = _suggest_sku(raw.brand, raw.product_id),
        name              = raw.title,
        brand             = raw.brand,
        category          = _normalise_category(raw.category_name),
        description       = desc,
        technical_specs   = _localize_technical_specs(raw.specs),
        image_url         = raw.image_url,
        source_product_id = raw.product_id,
        source_url        = source_url,
        raw_source_payload = raw.raw,
    )


# ─── Providers ────────────────────────────────────────────────────────────────

class IcecatProvider(ABC):
    @abstractmethod
    async def fetch(self, product_id: str) -> Optional[RawIcecatProduct]:
        ...

    async def fetch_by_ean(self, ean: str) -> Optional[RawIcecatProduct]:
        """
        Default: not supported. Providers que soporten lookup por EAN deben
        sobrescribir este método (ej: OpenIcecatProvider usa el endpoint EAN).
        """
        return None


class OpenIcecatProvider(IcecatProvider):
    """
    Uses the icecat.biz REST API.
    Register for free at https://icecat.biz to obtain credentials.
    Open Icecat (free tier) exposes products from brands that opted in.
    """

    def __init__(self, username: str, password: str = ""):
        self.username = username
        self.password = password

    async def fetch(self, product_id: str) -> Optional[RawIcecatProduct]:
        """
        Fetch product data from Icecat LIVE JSON API.
        Endpoint:
          https://live.icecat.biz/api/?UserName={shopname}&Language=es&icecat_id={id}

        Notes:
          - Open Icecat (free) returns only sponsored brands.
          - Lenovo, Cisco, NetApp, Dell EMC, etc. require Full Icecat (paid).
          - On non-OK responses we log the message so admins know why it failed.
        """
        import httpx

        url    = "https://live.icecat.biz/api/"
        params = {
            "UserName":   self.username,
            "Language":   os.getenv("ICECAT_LANG", "es"),
            "icecat_id":  product_id,
        }

        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(
                    url,
                    params=params,
                    auth=(self.username, self.password) if self.password else None,
                )
        except Exception as exc:
            logger.error("Icecat HTTP error for product %s: %s", product_id, exc)
            return None

        if resp.status_code != 200:
            logger.warning("Icecat API %s → HTTP %s %s",
                           product_id, resp.status_code, resp.text[:200])
            return None

        try:
            payload = resp.json()
        except Exception as exc:
            logger.error("Icecat: invalid JSON for product %s: %s", product_id, exc)
            return None

        msg = payload.get("msg")
        if msg and msg != "OK":
            logger.info("Icecat: product %s rejected by API: %s", product_id, msg)
            return None

        return _parse_icecat_json(payload, product_id)

    async def fetch_by_ean(self, ean: str) -> Optional[RawIcecatProduct]:
        """
        Lookup por EAN/GTIN usando el endpoint LIVE.
        https://live.icecat.biz/api/?UserName={shopname}&Language=es&GTIN={ean}
        """
        import httpx

        url    = "https://live.icecat.biz/api/"
        params = {
            "UserName": self.username,
            "Language": os.getenv("ICECAT_LANG", "es"),
            "GTIN":     ean,
        }
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(
                    url,
                    params=params,
                    auth=(self.username, self.password) if self.password else None,
                )
        except Exception as exc:
            logger.error("Icecat HTTP error EAN %s: %s", ean, exc)
            return None

        if resp.status_code != 200:
            logger.warning("Icecat EAN %s → HTTP %s %s", ean, resp.status_code, resp.text[:200])
            return None

        try:
            payload = resp.json()
        except Exception as exc:
            logger.error("Icecat: invalid JSON for EAN %s: %s", ean, exc)
            return None

        msg = payload.get("msg")
        if msg and msg != "OK":
            logger.info("Icecat: EAN %s rejected by API: %s", ean, msg)
            return None

        return _parse_icecat_json(payload, ean)


class MockIcecatProvider(IcecatProvider):
    """
    Realistic mock provider for development / when no credentials are configured.
    Returns believable product data so the full import flow works end-to-end.
    """

    _MOCK_CATALOG: dict[str, dict] = {
        "83791490": {
            "ProductID": 83791490,
            "Title": "HPE ProLiant DL380 Gen10 Plus",
            "Brand": "HPE",
            "ShortDesc": "Servidor rack 2U optimizado para cargas de trabajo críticas.",
            "LongDesc": (
                "El HPE ProLiant DL380 Gen10 Plus es un servidor 2U versátil y seguro diseñado para soportar "
                "cargas de trabajo críticas con el máximo rendimiento. Soporta hasta 2 procesadores Intel Xeon "
                "Scalable de 3ª generación y hasta 3TB de RAM DDR4."
            ),
            "HighPicURL": "https://images.icecat.biz/img/norm/high/29610498-HPE.jpg",
            "Category": {"ID": 1, "Name": "Servers"},
            "FeaturesGroups": [
                {"ID": 1, "Name": "General", "Features": [
                    {"Feature": {"Name": "Factor de forma"}, "LocalValue": {"_": "Rack 2U"}, "Measure": {}},
                    {"Feature": {"Name": "Familia del procesador"}, "LocalValue": {"_": "Intel Xeon Silver"}, "Measure": {}},
                    {"Feature": {"Name": "Núcleos del procesador"}, "LocalValue": {"_": "16"}, "Measure": {"Signs": {"Sign": [{"_": "núcleos"}]}}},
                    {"Feature": {"Name": "Frecuencia del procesador"}, "LocalValue": {"_": "2,4"}, "Measure": {"Signs": {"Sign": [{"_": "GHz"}]}}},
                    {"Feature": {"Name": "RAM máxima"}, "LocalValue": {"_": "3072"}, "Measure": {"Signs": {"Sign": [{"_": "GB"}]}}},
                ]},
                {"ID": 2, "Name": "Almacenamiento", "Features": [
                    {"Feature": {"Name": "Bahías de almacenamiento"}, "LocalValue": {"_": "8× SFF SAS/SATA/NVMe"}, "Measure": {}},
                    {"Feature": {"Name": "Controlador RAID"}, "LocalValue": {"_": "HPE Smart Array P408i-a SR"}, "Measure": {}},
                ]},
                {"ID": 3, "Name": "Red", "Features": [
                    {"Feature": {"Name": "Red"}, "LocalValue": {"_": "4× 1 GbE FlexibleLOM"}, "Measure": {}},
                ]},
                {"ID": 4, "Name": "Energía", "Features": [
                    {"Feature": {"Name": "Fuente de alimentación"}, "LocalValue": {"_": "800"}, "Measure": {"Signs": {"Sign": [{"_": "W"}]}}},
                    {"Feature": {"Name": "Tipo de fuente"}, "LocalValue": {"_": "Hot-plug Platinum"}, "Measure": {}},
                ]},
            ],
        },
        "61034977": {
            "ProductID": 61034977,
            "Title": "Cisco Catalyst C9300-48P-E",
            "Brand": "Cisco",
            "ShortDesc": "Switch Catalyst 9300 de 48 puertos PoE+ con soporte SD-Access.",
            "LongDesc": (
                "El Cisco Catalyst 9300 es la plataforma de switching de capa 3 más segura y completa para "
                "empresas. Soporta SD-Access, MACSEC y es preparado para DNA."
            ),
            "HighPicURL": "https://images.icecat.biz/img/norm/high/cisco-catalyst-c9300.jpg",
            "Category": {"ID": 2, "Name": "Network switches"},
            "FeaturesGroups": [
                {"ID": 1, "Name": "General", "Features": [
                    {"Feature": {"Name": "Puertos"}, "LocalValue": {"_": "48"}, "Measure": {"Signs": {"Sign": [{"_": "puertos"}]}}},
                    {"Feature": {"Name": "PoE"}, "LocalValue": {"_": "Sí"}, "Measure": {}},
                    {"Feature": {"Name": "Presupuesto PoE"}, "LocalValue": {"_": "740"}, "Measure": {"Signs": {"Sign": [{"_": "W"}]}}},
                    {"Feature": {"Name": "Capacidad de conmutación"}, "LocalValue": {"_": "208"}, "Measure": {"Signs": {"Sign": [{"_": "Gb/s"}]}}},
                    {"Feature": {"Name": "Capa"}, "LocalValue": {"_": "L3"}, "Measure": {}},
                    {"Feature": {"Name": "Enlaces ascendentes"}, "LocalValue": {"_": "4× 10 GbE SFP+"}, "Measure": {}},
                ]},
            ],
        },
    }

    _DEFAULT_MOCK = {
        "ProductID": 0,
        "Title": "Producto de ejemplo (mock)",
        "Brand": "Demo Brand",
        "ShortDesc": "Este es un producto generado por el proveedor mock de Icecat.",
        "LongDesc": (
            "No se configuraron credenciales de Icecat (ICECAT_USERNAME). "
            "Estás viendo datos mock. Regístrate en https://icecat.biz para acceder al catálogo real."
        ),
        "HighPicURL": "",
        "Category": {"ID": 1, "Name": "Servers"},
        "FeaturesGroups": [
            {"ID": 1, "Name": "General", "Features": [
                {"Feature": {"Name": "Origen"}, "LocalValue": {"_": "Proveedor simulado (mock)"}, "Measure": {}},
                {"Feature": {"Name": "Nota"}, "LocalValue": {"_": "Configura ICECAT_USERNAME para datos reales"}, "Measure": {}},
            ]},
        ],
    }

    async def fetch(self, product_id: str) -> Optional[RawIcecatProduct]:
        raw = self._MOCK_CATALOG.get(product_id, dict(self._DEFAULT_MOCK))
        raw = dict(raw)
        raw["ProductID"] = int(product_id) if product_id.isdigit() else 0
        logger.info("MockIcecatProvider: returning mock data for product_id=%s", product_id)
        return _parse_icecat_json({"data": raw}, product_id)

    async def fetch_by_ean(self, ean: str) -> Optional[RawIcecatProduct]:
        # En modo mock, devolvemos el primer producto del catálogo como muestra de
        # enriquecimiento — útil para probar la UI sin credenciales reales.
        if not self._MOCK_CATALOG:
            return None
        first_id = next(iter(self._MOCK_CATALOG.keys()))
        return await self.fetch(first_id)


# ─── Provider factory ─────────────────────────────────────────────────────────

def get_provider() -> IcecatProvider:
    """
    Return the appropriate provider based on env config.
    With ICECAT_USERNAME set  → OpenIcecatProvider (real API).
    Without                   → MockIcecatProvider (no credentials needed).
    """
    username = os.getenv("ICECAT_USERNAME", "").strip()
    password = os.getenv("ICECAT_PASSWORD", "").strip()
    if username:
        logger.debug("Using OpenIcecatProvider (username=%s)", username)
        return OpenIcecatProvider(username=username, password=password)
    logger.debug("ICECAT_USERNAME not set — using MockIcecatProvider")
    return MockIcecatProvider()
