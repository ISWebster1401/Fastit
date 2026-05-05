"""
Fixtures compartidos para todos los tests.
Usa SQLite en memoria para aislar completamente cada test.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.models.product import Product, StockStatus
from app.models.order import Order, OrderItem, OrderStatus, DocumentType
from app.services.auth_service import hash_password, create_access_token

TEST_DB_URL = "sqlite:///./test_fastit.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def reset_db():
    """Crea y destruye las tablas antes/después de cada test."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    return TestClient(app)


# ── Usuarios ──────────────────────────────────────────────────────────────────

@pytest.fixture
def admin_user(db):
    user = User(
        email="admin@fastit.cl",
        hashed_password=hash_password("admin1234"),
        is_admin=True,
        is_company=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def regular_user(db):
    user = User(
        email="empresa@test.cl",
        hashed_password=hash_password("user1234"),
        is_admin=False,
        is_company=True,
        rut="76.123.456-7",
        business_name="Empresa Test SpA",
        business_activity="Tecnología",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_token(admin_user):
    return create_access_token(admin_user.id)


@pytest.fixture
def user_token(regular_user):
    return create_access_token(regular_user.id)


# ── Productos ─────────────────────────────────────────────────────────────────

@pytest.fixture
def server_product(db):
    p = Product(
        sku="HPE-TEST-001",
        name="HPE ProLiant DL380 Test",
        description="Servidor de prueba",
        brand="HPE",
        category="servers",
        stock_status=StockStatus.available,
        base_price=5000.00,
        public_price=5900.00,
        technical_specs={"CPU": "Intel Xeon", "RAM": "64GB"},
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@pytest.fixture
def storage_product(db):
    p = Product(
        sku="NETAPP-TEST-001",
        name="NetApp AFF Test",
        description="Storage de prueba",
        brand="NetApp",
        category="storage",
        stock_status=StockStatus.available,
        base_price=10000.00,
        public_price=12200.00,
        technical_specs={"Type": "All-Flash", "Capacity": "100TB"},
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@pytest.fixture
def oos_product(db):
    p = Product(
        sku="OOS-TEST-001",
        name="Producto Sin Stock",
        description="",
        brand="Dell",
        category="servers",
        stock_status=StockStatus.out_of_stock,
        base_price=2000.00,
        public_price=2360.00,
        technical_specs={},
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


# ── Órdenes ───────────────────────────────────────────────────────────────────

@pytest.fixture
def pending_order(db, regular_user, server_product):
    order = Order(
        user_id=regular_user.id,
        total_amount=5900.00,
        status=OrderStatus.pending,
        document_type=DocumentType.boleta,
    )
    db.add(order)
    db.flush()
    db.add(OrderItem(
        order_id=order.id,
        product_id=server_product.id,
        quantity=1,
        unit_price=5900.00,
    ))
    db.commit()
    db.refresh(order)
    return order
