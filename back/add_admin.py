"""Crea o actualiza cuentas admin fijas. Se ejecuta en cada deploy (startup.sh)."""
import os
import sys

sys.path.insert(0, ".")

from sqlalchemy import func

from app.database import SessionLocal, Base, engine
from app.models import User
from app.services.auth_service import hash_password
import app.models                             # noqa: F401

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Contraseña inicial: definir ADMIN_BOOTSTRAP_PASSWORD en Render (recomendado en producción).
_DEFAULT_PW = os.getenv("ADMIN_BOOTSTRAP_PASSWORD", "1234")

ADMINS = [
    {"email": "seb@fastit.cl",        "password": _DEFAULT_PW},
    {"email": "nahumdiaz@fastit.cl", "password": _DEFAULT_PW},
]

# Emails históricos con mayúsculas que deben normalizarse a minúsculas
_EMAIL_ALIASES = {
    "NahumDiaz@fastit.cl": "nahumdiaz@fastit.cl",
    "NAHUMDIAZ@FASTIT.CL": "nahumdiaz@fastit.cl",
}


def _apply_email_aliases():
    for wrong, right in _EMAIL_ALIASES.items():
        u_wrong = db.query(User).filter(User.email == wrong).first()
        if not u_wrong:
            continue
        u_right = db.query(User).filter(func.lower(User.email) == right.lower()).first()
        if u_right and u_right.id != u_wrong.id:
            print(
                f"  [warn] Ya existe otro usuario con {right} (id {u_right.id}) "
                f"y también {wrong} (id {u_wrong.id}). Revisa en la base de datos."
            )
            continue
        u_wrong.email = right
        print(f"  Email normalizado: {wrong} → {right}")


_apply_email_aliases()
db.commit()

for a in ADMINS:
    email = a["email"].strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if user:
        user.email = email
        user.hashed_password = hash_password(a["password"])
        user.is_admin = True
        user.is_active = True
        user.email_verified = True
        print(f"  Actualizado: {email}")
    else:
        db.add(User(
            email             = email,
            hashed_password   = hash_password(a["password"]),
            is_admin          = True,
            is_company        = False,
            is_active         = True,
            email_verified    = True,
        ))
        print(f"  Creado: {email}")

db.commit()
db.close()
print("add_admin completado.")
