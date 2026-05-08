"""Crea o actualiza cuentas admin fijas. Se ejecuta en cada deploy."""
import sys
sys.path.insert(0, ".")

from app.database import SessionLocal, Base, engine
from app.models import User
from app.services.auth_service import hash_password
import app.models  # noqa

Base.metadata.create_all(bind=engine)
db = SessionLocal()

ADMINS = [
    {"email": "seb@fastit.cl",         "password": "1234"},
    {"email": "NahumDiaz@fastit.cl",   "password": "1234"},
]

for a in ADMINS:
    user = db.query(User).filter(User.email == a["email"]).first()
    if user:
        user.hashed_password = hash_password(a["password"])
        user.is_admin = True
        print(f"  Actualizado: {a['email']}")
    else:
        db.add(User(
            email=a["email"],
            hashed_password=hash_password(a["password"]),
            is_admin=True,
            is_company=False,
        ))
        print(f"  Creado: {a['email']}")

db.commit()
db.close()
print("add_admin completado.")
