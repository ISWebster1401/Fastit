import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import settings
from app.database import Base, engine
from app.routers import products, checkout, webhooks, auth, orders, admin, advisor, payments, flow, meta, shipping
import app.models  # noqa: F401

from app.migrations import run as run_migrations
Base.metadata.create_all(bind=engine)  # primero crear tablas
run_migrations()                        # luego migraciones y seed

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

_cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(checkout.router)
app.include_router(webhooks.router)
app.include_router(orders.router)
app.include_router(admin.router)
app.include_router(advisor.router)
app.include_router(payments.router)
app.include_router(flow.router)
app.include_router(meta.router)
app.include_router(shipping.router)


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "app": settings.APP_NAME}


# Sirve imágenes de productos subidas por el admin
_products_img_dir = os.path.join(os.path.dirname(__file__), "..", "static", "products")
os.makedirs(_products_img_dir, exist_ok=True)
app.mount("/products-images", StaticFiles(directory=_products_img_dir), name="products-images")

# Sirve el frontend compilado si existe el directorio static/
_static = os.path.join(os.path.dirname(__file__), "..", "static")
_assets = os.path.join(_static, "assets")

if os.path.isdir(_static):
    if os.path.isdir(_assets):
        app.mount("/assets", StaticFiles(directory=_assets), name="assets")

    _index = os.path.join(_static, "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str = ""):
        return FileResponse(_index)
else:
    @app.get("/", tags=["Health"])
    def root():
        return {"status": "ok", "app": settings.APP_NAME}
