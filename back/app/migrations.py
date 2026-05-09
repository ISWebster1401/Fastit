"""
Migraciones ligeras para SQLite — agrega columnas nuevas y seed inicial si faltan.
"""
import json
from sqlalchemy import text
from app.database import engine

WORKSTATION_SKU = "DELL-PREC-7960-WS1"

WORKSTATION_COMPONENTS = [
    {
        "id": "mobo", "type": "Placa Madre", "name": "Placa madre Dell Precision 7960",
        "brand": "Dell", "price_usd": 400, "color": "#f97316",
        "specs": {"Zócalo": "LGA 4677", "Chipset": "Intel W790", "Ranuras RAM": "8× DDR5 ECC",
                  "PCIe": "4× PCIe 5.0 x16", "USB": "Thunderbolt 4 + USB 3.2 Gen2", "Factor de forma": "E-ATX"}
    },
    {
        "id": "cpu", "type": "Procesador", "name": "Intel Xeon W5-3435X",
        "brand": "Intel", "price_usd": 890, "color": "#3b82f6",
        "specs": {"Núcleos": "16C / 32T", "Frecuencia base": "3,1 GHz", "Máx. turbo": "4,7 GHz",
                  "Caché L3": "45 MB", "TDP": "270 W", "Zócalo": "LGA 4677"}
    },
    {
        "id": "cooling", "type": "Refrigeración", "name": "Refrigeración líquida AIO 360 mm",
        "brand": "OEM", "price_usd": 160, "color": "#06b6d4",
        "specs": {"Tipo": "Líquida AIO", "Radiador": "360 mm", "Ventiladores": "3× 120 mm PWM",
                  "Compatibilidad": "LGA 4677", "RPM": "400–2000", "Ruido máx.": "30 dBA"}
    },
    {
        "id": "ram", "type": "Memoria RAM", "name": "64 GB DDR5 ECC 4800 MHz",
        "brand": "Samsung", "price_usd": 420, "color": "#8b5cf6",
        "specs": {"Capacidad": "64 GB (4×16 GB)", "Tipo": "DDR5 ECC Registrada",
                  "Velocidad": "4800 MHz", "Latencia": "CL40", "Canales": "Cuadruple"}
    },
    {
        "id": "gpu", "type": "Tarjeta Gráfica", "name": "NVIDIA RTX 4000 Ada Generation",
        "brand": "NVIDIA", "price_usd": 1250, "color": "#10b981",
        "specs": {"VRAM": "20 GB GDDR6", "Núcleos CUDA": "6144", "Ancho de banda": "360 GB/s",
                  "TDP": "130 W", "Interfaz": "PCIe 4.0 x16", "Salidas": "4× DisplayPort 1.4"}
    },
    {
        "id": "ssd", "type": "Almacenamiento NVMe", "name": "Samsung 990 Pro 2 TB",
        "brand": "Samsung", "price_usd": 180, "color": "#f59e0b",
        "specs": {"Capacidad": "2 TB", "Interfaz": "PCIe 4.0 x4 NVMe",
                  "Lectura secuencial": "7450 MB/s", "Escritura secuencial": "6900 MB/s",
                  "NAND": "V-NAND TLC", "Garantía": "5 años"}
    },
    {
        "id": "hdd", "type": "Almacenamiento HDD", "name": "Seagate IronWolf Pro 8 TB",
        "brand": "Seagate", "price_usd": 220, "color": "#64748b",
        "specs": {"Capacidad": "8 TB", "RPM": "7200 rpm", "Caché": "256 MB",
                  "Interfaz": "SATA 6 Gb/s", "Uso recomendado": "24/7 estación de trabajo/NAS", "Garantía": "5 años"}
    },
    {
        "id": "psu", "type": "Fuente de Poder", "name": "Delta 1400 W 80 Plus Platinum",
        "brand": "Delta", "price_usd": 280, "color": "#ef4444",
        "specs": {"Potencia": "1400 W", "Certificación": "80 PLUS Platinum", "Eficiencia": "92 % máx.",
                  "Protecciones": "OVP · UVP · OCP · SCP", "Factor de forma": "ATX"}
    },
]

def run():
    _apply_schema_migrations()
    _seed_products()
    _seed_users()


def _apply_schema_migrations():
    migrations = [
        "ALTER TABLE users    ADD COLUMN is_active           BOOLEAN DEFAULT 1",
        "ALTER TABLE users    ADD COLUMN email_verified      BOOLEAN DEFAULT 0",
        "ALTER TABLE users    ADD COLUMN verification_token  VARCHAR(64)",
        "ALTER TABLE products ADD COLUMN components          TEXT",
        "ALTER TABLE products ADD COLUMN image_url           VARCHAR(512)",
        "ALTER TABLE products ADD COLUMN source              VARCHAR(20) DEFAULT 'manual'",
        "ALTER TABLE products ADD COLUMN source_url          VARCHAR(512)",
        "ALTER TABLE products ADD COLUMN source_product_id   VARCHAR(64)",
        "ALTER TABLE products ADD COLUMN source_synced_at    DATETIME",
        "ALTER TABLE products ADD COLUMN raw_source_payload  TEXT",
        "ALTER TABLE orders   ADD COLUMN boleta_full_name    VARCHAR(255)",
        "ALTER TABLE orders   ADD COLUMN boleta_rut          VARCHAR(20)",
        "ALTER TABLE orders   ADD COLUMN boleta_email        VARCHAR(255)",
        "ALTER TABLE orders   ADD COLUMN exchange_rate_used  NUMERIC(10,2)",
        "ALTER TABLE orders   ADD COLUMN shipping_address    VARCHAR(255)",
        "ALTER TABLE orders   ADD COLUMN shipping_commune    VARCHAR(100)",
        "ALTER TABLE orders   ADD COLUMN shipping_region     VARCHAR(100)",
        "ALTER TABLE orders   ADD COLUMN shipping_cost       NUMERIC(10,2) DEFAULT 0",
        "ALTER TABLE products ADD COLUMN weight_kg           NUMERIC(8,2)",
        "ALTER TABLE products ADD COLUMN height_cm           NUMERIC(8,2)",
        "ALTER TABLE products ADD COLUMN width_cm            NUMERIC(8,2)",
        "ALTER TABLE products ADD COLUMN length_cm           NUMERIC(8,2)",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass


_PRODUCTS_SEED = [
    {
        "sku":   "HPE-P28948-B21",
        "name":  "HPE ProLiant DL380 Gen10 Plus",
        "desc":  "Servidor rack 2U de propósito general con Intel Xeon Scalable.",
        "brand": "HPE",
        "cat":   "servers",
        "stock": "available",
        "base":  5200.00,
        "pub":   6136.00,
        "specs": json.dumps({
            "Factor de forma": "Rack 2U",
            "Procesador": "Intel Xeon Silver 4314 2,4 GHz 16 núcleos",
            "RAM máxima": "3 TB DDR4",
            "Bahías de almacenamiento": "8× SFF SAS/SATA/NVMe",
            "Fuente de alimentación": "800 W Flex Slot Platinum",
            "Red": "4× 1 GbE",
        }),
    },
    {
        "sku":   "HPE-P26359-B21",
        "name":  "HPE MSA 2060 SAS 12G",
        "desc":  "Storage SAN/DAS de nivel entrada con alta densidad.",
        "brand": "HPE",
        "cat":   "storage",
        "stock": "available",
        "base":  3800.00,
        "pub":   4636.00,
        "specs": json.dumps({
            "Tipo": "SAN/DAS híbrido",
            "Bahías de discos": "24 LFF + 2 SFF",
            "Interfaz": "SAS 12 Gb/s",
            "Capacidad bruta máxima": "336 TB",
            "Controladores": "Doble activo-activo",
            "Caché": "4 GB en espejo",
        }),
    },
    {
        "sku":   "CISCO-C9300-48P-E",
        "name":  "Cisco Catalyst 9300 48-Port PoE+",
        "desc":  "Switch gestionable enterprise con soporte SD-Access.",
        "brand": "Cisco",
        "cat":   "networking",
        "stock": "available",
        "base":  4100.00,
        "pub":   4920.00,
        "specs": json.dumps({
            "Puertos": "48× 1 GbE PoE+",
            "Enlaces ascendentes": "4× 10 GbE SFP+",
            "Presupuesto PoE": "740 W",
            "Capacidad de conmutación": "208 Gb/s",
            "Capa": "L3",
            "Características": "SD-Access, MACSEC, listo para DNA",
        }),
    },
    {
        "sku":   "DELL-R750XA-8GPU",
        "name":  "Dell PowerEdge R750xa",
        "desc":  "Servidor optimizado para IA/ML con soporte hasta 8 GPU.",
        "brand": "Dell",
        "cat":   "servers",
        "stock": "on_request",
        "base":  14500.00,
        "pub":   17110.00,
        "specs": json.dumps({
            "Factor de forma": "Rack 2U",
            "Procesador": "2× Intel Xeon Gold 6330 28 núcleos",
            "RAM máxima": "4 TB DDR4 3200 MT/s",
            "Ranuras GPU": "Hasta 8× PCIe Gen4",
            "Almacenamiento": "12× 2,5\" NVMe",
            "Red": "2× 25 GbE + 2× 1 GbE iDRAC",
        }),
    },
    {
        "sku":   "NETAPP-AFF-A250",
        "name":  "NetApp AFF A250",
        "desc":  "Array all-flash NVMe para cargas de trabajo críticas.",
        "brand": "NetApp",
        "cat":   "storage",
        "stock": "low_stock",
        "base":  18000.00,
        "pub":   21960.00,
        "specs": json.dumps({
            "Tipo": "All-flash NVMe",
            "Capacidad máxima": "576 TB en bruto",
            "Latencia": "< 200 µs",
            "Protocolo": "NFS, CIFS, iSCSI, FC, NVMe/FC",
            "Controladores": "Par HA",
            "Software": "ONTAP 9.x incluido",
        }),
    },
    {
        "sku":   WORKSTATION_SKU,
        "name":  "Dell Precision 7960 Tower Workstation",
        "desc":  "Workstation de alto rendimiento para diseño 3D, renderizado, simulaciones CAE y cargas de trabajo de IA. Procesador Xeon W de última generación con GPU profesional NVIDIA RTX certificada para software CAD/CAM.",
        "brand": "Dell",
        "cat":   "workstations",
        "stock": "available",
        "base":  3800.00,
        "pub":   4484.00,
        "specs": json.dumps({
            "Factor de forma": "Torre completa",
            "Procesador":  "Intel Xeon W5-3435X 16C/32T",
            "Memoria RAM": "64 GB DDR5 ECC 4800 MHz",
            "GPU":         "NVIDIA RTX 4000 Ada 20 GB",
            "Almacenamiento": "2 TB NVMe + 8 TB HDD",
            "Fuente":      "1400 W 80 Plus Platinum",
            "Refrigeración": "Líquida AIO 360 mm",
            "Sistema operativo": "Windows 11 Pro for Workstations",
            "Garantía":    "3 años en sitio NBD",
        }),
        "comps": json.dumps(WORKSTATION_COMPONENTS),
    },
]


def _seed_products():
    with engine.connect() as conn:
        for p in _PRODUCTS_SEED:
            exists = conn.execute(
                text("SELECT id FROM products WHERE sku = :sku"),
                {"sku": p["sku"]}
            ).first()
            if exists:
                continue

            comps = p.get("comps")
            conn.execute(text("""
                INSERT INTO products
                  (sku, name, description, brand, category, technical_specs, components,
                   base_price, public_price, stock_status)
                VALUES
                  (:sku, :name, :desc, :brand, :cat, :specs, :comps,
                   :base, :pub, :stock)
            """), {
                "sku":   p["sku"],
                "name":  p["name"],
                "desc":  p["desc"],
                "brand": p["brand"],
                "cat":   p["cat"],
                "specs": p["specs"],
                "comps": comps,
                "base":  p["base"],
                "pub":   p["pub"],
                "stock": p["stock"],
            })
            conn.commit()
            print(f"[seed] {p['sku']} insertado (${p['pub']} USD)")


def _seed_users():
    try:
        from app.services.auth_service import hash_password
    except Exception:
        return

    users = [
        {
            "email":    "seb@fastit.cl",
            "password": "1234",
            "is_admin": 1,
            "is_company": 0,
            "rut": None,
            "business_name": None,
            "business_activity": None,
        },
        {
            "email":    "nahumdiaz@fastit.cl",
            "password": "1234",
            "is_admin": 1,
            "is_company": 0,
            "rut": None,
            "business_name": None,
            "business_activity": None,
        },
    ]

    with engine.connect() as conn:
        for u in users:
            exists = conn.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": u["email"]}
            ).first()
            if exists:
                continue
            try:
                conn.execute(text("""
                    INSERT INTO users
                      (email, hashed_password, is_admin, is_company,
                       rut, business_name, business_activity,
                       is_active, email_verified)
                    VALUES
                      (:email, :pw, :admin, :company,
                       :rut, :biz, :act,
                       1, 1)
                """), {
                    "email":   u["email"],
                    "pw":      hash_password(u["password"]),
                    "admin":   u["is_admin"],
                    "company": u["is_company"],
                    "rut":     u["rut"],
                    "biz":     u["business_name"],
                    "act":     u["business_activity"],
                })
                conn.commit()
                print(f"[seed] Usuario {u['email']} creado")
            except Exception as e:
                print(f"[seed] Usuario {u['email']} omitido: {e}")
