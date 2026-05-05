"""
Migraciones ligeras para SQLite — agrega columnas nuevas y seed inicial si faltan.
"""
import json
from sqlalchemy import text
from app.database import engine

WORKSTATION_SKU = "DELL-PREC-7960-WS1"

WORKSTATION_COMPONENTS = [
    {
        "id": "mobo", "type": "Placa Madre", "name": "Dell Precision 7960 Motherboard",
        "brand": "Dell", "price_usd": 400, "color": "#f97316",
        "specs": {"Socket": "LGA 4677", "Chipset": "Intel W790", "Slots RAM": "8× DDR5 ECC",
                  "PCIe": "4× PCIe 5.0 x16", "USB": "Thunderbolt 4 + USB 3.2 Gen2", "Factor de forma": "E-ATX"}
    },
    {
        "id": "cpu", "type": "Procesador", "name": "Intel Xeon W5-3435X",
        "brand": "Intel", "price_usd": 890, "color": "#3b82f6",
        "specs": {"Núcleos": "16C / 32T", "Frecuencia base": "3.1 GHz", "Boost máx.": "4.7 GHz",
                  "Caché L3": "45 MB", "TDP": "270 W", "Socket": "LGA 4677"}
    },
    {
        "id": "cooling", "type": "Refrigeración", "name": "AIO Liquid Cooling 360mm",
        "brand": "OEM", "price_usd": 160, "color": "#06b6d4",
        "specs": {"Tipo": "Líquida AIO", "Radiador": "360 mm", "Ventiladores": "3× 120 mm PWM",
                  "Compatibilidad": "LGA 4677", "RPM": "400–2000", "Ruido máx.": "30 dBA"}
    },
    {
        "id": "ram", "type": "Memoria RAM", "name": "64GB DDR5 ECC 4800MHz",
        "brand": "Samsung", "price_usd": 420, "color": "#8b5cf6",
        "specs": {"Capacidad": "64 GB (4×16 GB)", "Tipo": "DDR5 ECC Registered",
                  "Velocidad": "4800 MHz", "Latencia": "CL40", "Canales": "Quad-channel"}
    },
    {
        "id": "gpu", "type": "Tarjeta Gráfica", "name": "NVIDIA RTX 4000 Ada Generation",
        "brand": "NVIDIA", "price_usd": 1250, "color": "#10b981",
        "specs": {"VRAM": "20 GB GDDR6", "CUDA Cores": "6144", "Ancho de banda": "360 GB/s",
                  "TDP": "130 W", "Interfaz": "PCIe 4.0 x16", "Salidas": "4× DisplayPort 1.4"}
    },
    {
        "id": "ssd", "type": "Almacenamiento NVMe", "name": "Samsung 990 Pro 2TB",
        "brand": "Samsung", "price_usd": 180, "color": "#f59e0b",
        "specs": {"Capacidad": "2 TB", "Interfaz": "PCIe 4.0 x4 NVMe",
                  "Lectura sec.": "7,450 MB/s", "Escritura sec.": "6,900 MB/s",
                  "NAND": "V-NAND TLC", "Garantía": "5 años"}
    },
    {
        "id": "hdd", "type": "Almacenamiento HDD", "name": "Seagate IronWolf Pro 8TB",
        "brand": "Seagate", "price_usd": 220, "color": "#64748b",
        "specs": {"Capacidad": "8 TB", "RPM": "7200 RPM", "Caché": "256 MB",
                  "Interfaz": "SATA 6 Gb/s", "Uso": "24/7 Workstation/NAS", "Garantía": "5 años"}
    },
    {
        "id": "psu", "type": "Fuente de Poder", "name": "Delta 1400W 80 Plus Platinum",
        "brand": "Delta", "price_usd": 280, "color": "#ef4444",
        "specs": {"Potencia": "1400 W", "Certificación": "80 PLUS Platinum", "Eficiencia": "92% máx.",
                  "Protecciones": "OVP · UVP · OCP · SCP", "Factor de forma": "ATX"}
    },
]

def run():
    _apply_schema_migrations()
    _seed_workstation()


def _apply_schema_migrations():
    migrations = [
        "ALTER TABLE users    ADD COLUMN is_active          BOOLEAN DEFAULT 1",
        "ALTER TABLE users    ADD COLUMN email_verified     BOOLEAN DEFAULT 0",
        "ALTER TABLE users    ADD COLUMN verification_token VARCHAR(64)",
        "ALTER TABLE products ADD COLUMN components         TEXT",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass


def _seed_workstation():
    with engine.connect() as conn:
        exists = conn.execute(
            text("SELECT id FROM products WHERE sku = :sku"),
            {"sku": WORKSTATION_SKU}
        ).first()
        if exists:
            return

        base_price  = 3800.00
        public_price = round(base_price * 1.18, 2)

        technical_specs = {
            "Form Factor": "Full Tower",
            "Procesador":  "Intel Xeon W5-3435X 16C/32T",
            "Memoria RAM": "64 GB DDR5 ECC 4800 MHz",
            "GPU":         "NVIDIA RTX 4000 Ada 20 GB",
            "Almacenamiento": "2 TB NVMe + 8 TB HDD",
            "Fuente":      "1400W 80 Plus Platinum",
            "Refrigeración": "Líquida AIO 360 mm",
            "Sistema Operativo": "Windows 11 Pro for Workstations",
            "Garantía":    "3 años on-site NBD",
        }

        conn.execute(text("""
            INSERT INTO products
              (sku, name, description, brand, category, technical_specs, components,
               base_price, public_price, stock_status)
            VALUES
              (:sku, :name, :desc, :brand, :cat, :specs, :comps,
               :base, :pub, 'available')
        """), {
            "sku":   WORKSTATION_SKU,
            "name":  "Dell Precision 7960 Tower Workstation",
            "desc":  "Workstation de alto rendimiento para diseño 3D, renderizado, simulaciones CAE y cargas de trabajo de IA. Procesador Xeon W de última generación con GPU profesional NVIDIA RTX certificada para software CAD/CAM.",
            "brand": "Dell",
            "cat":   "workstations",
            "specs": json.dumps(technical_specs),
            "comps": json.dumps(WORKSTATION_COMPONENTS),
            "base":  base_price,
            "pub":   public_price,
        })
        conn.commit()
        print(f"[seed] Workstation {WORKSTATION_SKU} insertada (${public_price} USD)")
