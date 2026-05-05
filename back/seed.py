"""Datos de ejemplo para desarrollo. Ejecutar: python3 seed.py"""
import sys
sys.path.insert(0, ".")

from app.database import SessionLocal, Base, engine
from app.models import Product, User, StockStatus
from app.services.pricing import calculate_public_price
from app.services.auth_service import hash_password
import app.models  # noqa

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if db.query(Product).count() > 0:
    print("DB ya tiene datos, seed omitido.")
    db.close()
    sys.exit(0)

products = [
    {
        "sku": "HPE-P28948-B21",
        "name": "HPE ProLiant DL380 Gen10 Plus",
        "description": "Servidor rack 2U de propósito general con Intel Xeon Scalable.",
        "brand": "HPE",
        "category": "servers",
        "stock_status": StockStatus.available,
        "base_price": 5200.00,
        "technical_specs": {
            "Form Factor": "2U Rack",
            "Processor": "Intel Xeon Silver 4314 2.4GHz 16-core",
            "Max RAM": "3TB DDR4",
            "Storage Bays": "8x SFF SAS/SATA/NVMe",
            "Power Supply": "800W Flex Slot Platinum",
            "Network": "4x 1GbE",
        },
    },
    {
        "sku": "HPE-P26359-B21",
        "name": "HPE MSA 2060 SAS 12G",
        "description": "Storage SAN/DAS de nivel entrada con alta densidad.",
        "brand": "HPE",
        "category": "storage",
        "stock_status": StockStatus.available,
        "base_price": 3800.00,
        "technical_specs": {
            "Type": "Hybrid SAN/DAS",
            "Drive Bays": "24 LFF + 2 SFF",
            "Interface": "SAS 12Gb/s",
            "Max Raw Capacity": "336TB",
            "Controllers": "Dual Active-Active",
            "Cache": "4GB mirrored",
        },
    },
    {
        "sku": "CISCO-C9300-48P-E",
        "name": "Cisco Catalyst 9300 48-Port PoE+",
        "description": "Switch gestionable enterprise con soporte SD-Access.",
        "brand": "Cisco",
        "category": "networking",
        "stock_status": StockStatus.available,
        "base_price": 4100.00,
        "technical_specs": {
            "Ports": "48x 1GbE PoE+",
            "Uplinks": "4x 10GbE SFP+",
            "PoE Budget": "740W",
            "Switching Capacity": "208 Gbps",
            "Layer": "L3",
            "Features": "SD-Access, MACSEC, DNA-ready",
        },
    },
    {
        "sku": "DELL-R750XA-8GPU",
        "name": "Dell PowerEdge R750xa",
        "description": "Servidor optimizado para IA/ML con soporte hasta 8 GPU.",
        "brand": "Dell",
        "category": "servers",
        "stock_status": StockStatus.on_request,
        "base_price": 14500.00,
        "technical_specs": {
            "Form Factor": "2U Rack",
            "Processor": "2x Intel Xeon Gold 6330 28-core",
            "Max RAM": "4TB DDR4 3200MT/s",
            "GPU Slots": "Up to 8x PCIe Gen4",
            "Storage": "12x 2.5\" NVMe",
            "Network": "2x 25GbE + 2x 1GbE iDRAC",
        },
    },
    {
        "sku": "NETAPP-AFF-A250",
        "name": "NetApp AFF A250",
        "description": "Array all-flash NVMe para cargas de trabajo críticas.",
        "brand": "NetApp",
        "category": "storage",
        "stock_status": StockStatus.low_stock,
        "base_price": 18000.00,
        "technical_specs": {
            "Type": "All-Flash NVMe",
            "Max Capacity": "576TB raw",
            "Latency": "<200µs",
            "Protocol": "NFS, CIFS, iSCSI, FC, NVMe/FC",
            "Controllers": "HA Pair",
            "Software": "ONTAP 9.x included",
        },
    },
]

for p in products:
    p["public_price"] = calculate_public_price(p["base_price"], p["category"])
    db.add(Product(**p))

# Admin principal — único con acceso al panel
admin_user = User(
    email             = "seb@fastit.cl",
    hashed_password   = hash_password("1234"),
    is_admin          = True,
    is_company        = False,
)
db.add(admin_user)

# Usuario demo para pruebas
demo_user = User(
    email             = "demo@empresa.cl",
    hashed_password   = hash_password("demo1234"),
    is_company        = True,
    rut               = "76.123.456-7",
    business_name     = "Empresa Demo SpA",
    business_activity = "Servicios de tecnología",
)
db.add(demo_user)

db.commit()
print(f"Seed completado: {len(products)} productos")
print(f"  Admin: seb@fastit.cl / 1234")
print(f"  Demo:  demo@empresa.cl / demo1234")
