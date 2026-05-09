"""
Servicio Chilexpress — 3 APIs oficiales:
  1. API Cobertura  → comunas y cobertura disponible
  2. API Cotizador  → tarifa según dimensiones y origen/destino
  3. API Envíos     → crear OT y consultar seguimiento

Sin CHILEXPRESS_API_KEY usa datos mock (tarifas hardcodeadas, comunas fijas).
Con clave: usa https://testservices.wschilexpress.com (sandbox) o
           https://services.wschilexpress.com (producción con CHILEXPRESS_ENV=production)

Registro: https://developers.wschilexpress.com/signup
Auth:     Header  Ocp-Apim-Subscription-Key: {api_key}
"""
import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

# ─── Comunas hardcodeadas (fallback sin API key) ──────────────────────────────
COMMUNES: dict[str, tuple[str, str]] = {
    "Santiago":              ("STGO", "Región Metropolitana"),
    "Providencia":           ("PROV", "Región Metropolitana"),
    "Las Condes":            ("LCON", "Región Metropolitana"),
    "Ñuñoa":                ("NNOA", "Región Metropolitana"),
    "Maipú":                 ("MAIPU", "Región Metropolitana"),
    "La Florida":            ("LFLO", "Región Metropolitana"),
    "Puente Alto":           ("PUAL", "Región Metropolitana"),
    "San Bernardo":          ("SBER", "Región Metropolitana"),
    "Quilicura":             ("QUIL", "Región Metropolitana"),
    "Peñalolén":             ("PENL", "Región Metropolitana"),
    "La Reina":              ("LREI", "Región Metropolitana"),
    "Vitacura":              ("VITA", "Región Metropolitana"),
    "Huechuraba":            ("HUEC", "Región Metropolitana"),
    "Macul":                 ("MACU", "Región Metropolitana"),
    "San Miguel":            ("SMIG", "Región Metropolitana"),
    "Estación Central":      ("ECEN", "Región Metropolitana"),
    "Cerrillos":             ("CERR", "Región Metropolitana"),
    "Lo Barnechea":          ("LOBA", "Región Metropolitana"),
    "Valparaíso":            ("VPAR", "Región de Valparaíso"),
    "Viña del Mar":          ("VDMA", "Región de Valparaíso"),
    "Quilpué":               ("QLPU", "Región de Valparaíso"),
    "Villa Alemana":         ("VALE", "Región de Valparaíso"),
    "San Antonio":           ("SANT", "Región de Valparaíso"),
    "Concepción":            ("CONC", "Región del Biobío"),
    "Talcahuano":            ("TALC", "Región del Biobío"),
    "Chillán":               ("CHIL", "Región del Biobío"),
    "Los Ángeles":           ("LANG", "Región del Biobío"),
    "Temuco":                ("TEMC", "Región de La Araucanía"),
    "Padre Las Casas":       ("PLCA", "Región de La Araucanía"),
    "Puerto Montt":          ("PMON", "Región de Los Lagos"),
    "Osorno":                ("OSOR", "Región de Los Lagos"),
    "Castro":                ("CAST", "Región de Los Lagos"),
    "Antofagasta":           ("ANTO", "Región de Antofagasta"),
    "Calama":                ("CALA", "Región de Antofagasta"),
    "Copiapó":               ("COPI", "Región de Atacama"),
    "La Serena":             ("LSER", "Región de Coquimbo"),
    "Coquimbo":              ("COQU", "Región de Coquimbo"),
    "Rancagua":              ("RANC", "Región de O'Higgins"),
    "San Fernando":          ("SFER", "Región de O'Higgins"),
    "Talca":                 ("TALCA", "Región del Maule"),
    "Curicó":                ("CURI", "Región del Maule"),
    "Chillán Viejo":         ("CHIV", "Región de Ñuble"),
    "Valdivia":              ("VALD", "Región de Los Ríos"),
    "Coyhaique":             ("COYH", "Región de Aysén"),
    "Punta Arenas":          ("PTAR", "Región de Magallanes"),
    "Iquique":               ("IQUI", "Región de Tarapacá"),
    "Alto Hospicio":         ("ALHO", "Región de Tarapacá"),
    "Arica":                 ("ARIC", "Región de Arica y Parinacota"),
}

_MOCK_RATES_CLP: dict[str, int] = {
    "Región Metropolitana":         3490,
    "Región de Valparaíso":         5290,
    "Región de O'Higgins":          5990,
    "Región del Maule":             6490,
    "Región de Ñuble":              6990,
    "Región del Biobío":            7290,
    "Región de La Araucanía":       7990,
    "Región de Los Ríos":           8490,
    "Región de Los Lagos":          8990,
    "Región de Aysén":             11990,
    "Región de Magallanes":        12990,
    "Región de Coquimbo":           6990,
    "Región de Atacama":            8490,
    "Región de Antofagasta":        9490,
    "Región de Tarapacá":          10490,
    "Región de Arica y Parinacota": 10990,
}

_DEFAULT_WEIGHT: dict[str, float] = {
    "servers": 18.0, "storage": 12.0, "networking": 4.0,
    "workstations": 22.0, "accessories": 1.5,
}


@dataclass
class ShippingQuote:
    commune:       str
    region:        str
    coverage_code: str
    price_clp:     int
    service_name:  str
    days_estimate: str
    is_mock:       bool


@dataclass
class ShipmentOT:
    ot_number:    str
    label_url:    str
    is_mock:      bool


def _settings():
    from app.core.config import settings
    return settings


def _base_url() -> str:
    s = _settings()
    env = getattr(s, "CHILEXPRESS_ENV", "test")
    if env == "production":
        return "https://services.wschilexpress.com"
    return "https://testservices.wschilexpress.com"


def _headers() -> dict:
    return {
        "Ocp-Apim-Subscription-Key": _settings().CHILEXPRESS_API_KEY,
        "Content-Type": "application/json",
    }


# ─── API 1: Cobertura ─────────────────────────────────────────────────────────

def get_communes_from_api() -> list[dict]:
    """
    API Cobertura: lista regiones y sus comunas.
    Retorna [{"commune": "...", "region": "...", "coverage_code": "..."}]
    """
    import httpx
    try:
        url = f"{_base_url()}/georreferencia/api/v1.0/regiones"
        resp = httpx.get(url, headers=_headers(), timeout=10)
        resp.raise_for_status()
        regions = resp.json().get("data", {}).get("regions", [])

        communes = []
        for reg in regions:
            reg_code = reg.get("regionCode")
            reg_name = reg.get("regionName", "")
            counties_url = f"{_base_url()}/georreferencia/api/v1.0/regiones/{reg_code}/ciudades"
            cr = httpx.get(counties_url, headers=_headers(), timeout=10)
            if cr.status_code != 200:
                continue
            for c in cr.json().get("data", {}).get("cities", []):
                communes.append({
                    "commune":       c.get("countyName", ""),
                    "region":        reg_name,
                    "coverage_code": c.get("countyCode", ""),
                })
        return communes
    except Exception as exc:
        logger.error("Chilexpress Cobertura API error: %s", exc)
        return []


# ─── API 2: Cotizador ─────────────────────────────────────────────────────────

def quote(commune: str, weight_kg: float = 5.0, declared_value_clp: int = 0) -> Optional[ShippingQuote]:
    entry = COMMUNES.get(commune)
    if not entry:
        return None
    coverage_code, region = entry

    if _settings().CHILEXPRESS_API_KEY:
        return _quote_real(coverage_code, commune, region, weight_kg, declared_value_clp)
    return _quote_mock(coverage_code, commune, region)


def _quote_mock(coverage_code: str, commune: str, region: str) -> ShippingQuote:
    price = _MOCK_RATES_CLP.get(region, 9990)
    return ShippingQuote(
        commune=commune, region=region, coverage_code=coverage_code,
        price_clp=price, service_name="Chilexpress Express",
        days_estimate="2-5 días hábiles", is_mock=True,
    )


def _quote_real(
    coverage_code: str, commune: str, region: str,
    weight_kg: float, declared_value_clp: int,
) -> Optional[ShippingQuote]:
    import httpx
    url  = f"{_base_url()}/tarificacion/api/v1.0/cotizaciones"
    body = {
        "originCountyCode":      "STGO",
        "destinationCountyCode": coverage_code,
        "package": {
            "weight": round(weight_kg, 2),
            "height": 30, "width": 40, "length": 50,
        },
        "productType":   3,
        "contentType":   1,
        "declaredWorth": declared_value_clp,
    }
    try:
        resp = httpx.post(url, json=body, headers=_headers(), timeout=10)
        resp.raise_for_status()
        rates = resp.json().get("data", {}).get("courierServiceOptions", [])
        if not rates:
            return _quote_mock(coverage_code, commune, region)
        best = min(rates, key=lambda r: r.get("serviceValue", 99999))
        return ShippingQuote(
            commune=commune, region=region, coverage_code=coverage_code,
            price_clp=int(best.get("serviceValue", 0)),
            service_name=best.get("serviceDescription", "Chilexpress"),
            days_estimate=f"{best.get('serviceTimeCommitment', '2-5')} días hábiles",
            is_mock=False,
        )
    except Exception as exc:
        logger.error("Chilexpress Cotizador error: %s — usando mock", exc)
        return _quote_mock(coverage_code, commune, region)


# ─── API 3: Envíos — crear OT ─────────────────────────────────────────────────

def create_shipment(
    order_id: int,
    recipient_name: str,
    address: str,
    commune_code: str,
    weight_kg: float = 5.0,
    declared_value_clp: int = 0,
) -> ShipmentOT:
    """
    API Envíos: crea una OT (Orden de Transporte) en Chilexpress.
    Sin CHILEXPRESS_API_KEY retorna OT mock.
    """
    if not _settings().CHILEXPRESS_API_KEY:
        return ShipmentOT(
            ot_number=f"MOCK-{order_id:06d}",
            label_url="",
            is_mock=True,
        )
    return _create_shipment_real(order_id, recipient_name, address, commune_code, weight_kg, declared_value_clp)


def _create_shipment_real(
    order_id: int, recipient_name: str, address: str,
    commune_code: str, weight_kg: float, declared_value_clp: int,
) -> ShipmentOT:
    import httpx
    url  = f"{_base_url()}/envios/api/v1.0/shipments"
    body = {
        "header": {
            "certificateNumber": 0,
            "clienteNumber":     getattr(_settings(), "CHILEXPRESS_TCC", ""),
            "counterNumber":     0,
            "warehouseNumber":   0,
        },
        "details": [{
            "addresses": [{
                "addressType":     "DEST",
                "countryCode":     "CL",
                "countyCode":      commune_code,
                "street":          address,
                "number":          "S/N",
                "complement":      "",
            }],
            "contacts": [{
                "name":  recipient_name,
                "email": "",
                "phone": "",
            }],
            "packages": [{
                "weight":          round(weight_kg, 2),
                "height":          30,
                "width":           40,
                "length":          50,
                "serviceDeliveryCode": "3",
                "declaredValue":   declared_value_clp,
                "deliveryReference": f"FIT{order_id}",
                "descriptionType": "1",
            }],
        }],
    }
    try:
        resp = httpx.post(url, json=body, headers=_headers(), timeout=15)
        resp.raise_for_status()
        data    = resp.json().get("data", {})
        ot      = data.get("barCode") or data.get("otNumber") or f"FIT{order_id}"
        label   = data.get("labelPDF") or data.get("label_url") or ""
        return ShipmentOT(ot_number=str(ot), label_url=label, is_mock=False)
    except Exception as exc:
        logger.error("Chilexpress Envíos error: %s", exc)
        return ShipmentOT(ot_number=f"ERR-{order_id}", label_url="", is_mock=True)
