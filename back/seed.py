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
            "Factor de forma": "Rack 2U",
            "Procesador": "Intel Xeon Silver 4314 2,4 GHz 16 núcleos",
            "RAM máxima": "3 TB DDR4",
            "Bahías de almacenamiento": "8× SFF SAS/SATA/NVMe",
            "Fuente de alimentación": "800 W Flex Slot Platinum",
            "Red": "4× 1 GbE",
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
            "Tipo": "SAN/DAS híbrido",
            "Bahías de discos": "24 LFF + 2 SFF",
            "Interfaz": "SAS 12 Gb/s",
            "Capacidad bruta máxima": "336 TB",
            "Controladores": "Doble activo-activo",
            "Caché": "4 GB en espejo",
        },
    },
    {
        "sku": "CISCO-C9300-48P-E",
        "name": "Cisco Catalyst 9300 48 puertos PoE+",
        "description": "Switch gestionable enterprise con soporte SD-Access.",
        "brand": "Cisco",
        "category": "networking",
        "stock_status": StockStatus.available,
        "base_price": 4100.00,
        "technical_specs": {
            "Puertos": "48× 1 GbE PoE+",
            "Enlaces ascendentes": "4× 10 GbE SFP+",
            "Presupuesto PoE": "740 W",
            "Capacidad de conmutación": "208 Gb/s",
            "Capa": "L3",
            "Características": "SD-Access, MACSEC, listo para DNA",
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
            "Factor de forma": "Rack 2U",
            "Procesador": "2× Intel Xeon Gold 6330 28 núcleos",
            "RAM máxima": "4 TB DDR4 3200 MT/s",
            "Ranuras GPU": "Hasta 8× PCIe Gen4",
            "Almacenamiento": "12× 2,5\" NVMe",
            "Red": "2× 25 GbE + 2× 1 GbE iDRAC",
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
            "Tipo": "All-flash NVMe",
            "Capacidad máxima": "576 TB en bruto",
            "Latencia": "< 200 µs",
            "Protocolo": "NFS, CIFS, iSCSI, FC, NVMe/FC",
            "Controladores": "Par HA",
            "Software": "ONTAP 9.x incluido",
        },
    },
]

for p in products:
    p["public_price"] = calculate_public_price(p["base_price"], p["category"])
    db.add(Product(**p))

# Admin principal
admin_user = User(
    email             = "seb@fastit.cl",
    hashed_password   = hash_password("1234"),
    is_admin          = True,
    is_company        = False,
    is_active         = True,
    email_verified    = True,
)
db.add(admin_user)

nahum_admin = User(
    email             = "nahumdiaz@fastit.cl",
    hashed_password   = hash_password("1234"),
    is_admin          = True,
    is_company        = False,
    is_active         = True,
    email_verified    = True,
)
db.add(nahum_admin)

# Usuario demo para pruebas
demo_user = User(
    email             = "demo@empresa.cl",
    hashed_password   = hash_password("demo1234"),
    is_company        = True,
    rut               = "76.123.456-7",
    business_name     = "Empresa Demo SpA",
    business_activity = "Servicios de tecnología",
    is_active         = True,
    email_verified    = True,
)
db.add(demo_user)

db.commit()
print(f"Seed completado: {len(products)} productos")
print("  Admin: seb@fastit.cl / 1234")
print("  Admin: nahumdiaz@fastit.cl / 1234")
print("  Demo:  demo@empresa.cl / demo1234")
db.close()
