"""Tests de endpoints de autenticación."""


class TestRegister:
    def test_register_personal_account(self, client):
        res = client.post("/api/auth/register", json={
            "email": "nuevo@test.cl",
            "password": "password123",
            "is_company": False,
        })
        assert res.status_code == 201
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "nuevo@test.cl"
        assert data["user"]["is_admin"] is False
        assert data["user"]["is_company"] is False

    def test_register_company_account(self, client):
        res = client.post("/api/auth/register", json={
            "email": "empresa@test.cl",
            "password": "password123",
            "is_company": True,
            "rut": "76.123.456-7",
            "business_name": "Mi Empresa SpA",
            "business_activity": "Servicios de tecnología",
        })
        assert res.status_code == 201
        data = res.json()
        assert data["user"]["is_company"] is True
        assert data["user"]["rut"] == "76.123.456-7"
        assert data["user"]["business_name"] == "Mi Empresa SpA"

    def test_register_duplicate_email_fails(self, client, regular_user):
        res = client.post("/api/auth/register", json={
            "email": regular_user.email,
            "password": "otropassword",
        })
        assert res.status_code == 409
        assert "registrado" in res.json()["detail"].lower()

    def test_register_missing_email_fails(self, client):
        res = client.post("/api/auth/register", json={"password": "test123"})
        assert res.status_code == 422

    def test_register_missing_password_fails(self, client):
        res = client.post("/api/auth/register", json={"email": "test@test.cl"})
        assert res.status_code == 422

    def test_new_user_is_not_admin(self, client):
        res = client.post("/api/auth/register", json={
            "email": "nonadmin@test.cl",
            "password": "password123",
        })
        assert res.json()["user"]["is_admin"] is False


class TestLogin:
    def test_login_success_returns_token(self, client, regular_user):
        res = client.post("/api/auth/login", json={
            "email": regular_user.email,
            "password": "user1234",
        })
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["user"]["email"] == regular_user.email

    def test_login_wrong_password(self, client, regular_user):
        res = client.post("/api/auth/login", json={
            "email": regular_user.email,
            "password": "password_incorrecto",
        })
        assert res.status_code == 401

    def test_login_nonexistent_user(self, client):
        res = client.post("/api/auth/login", json={
            "email": "noexiste@test.cl",
            "password": "cualquier_cosa",
        })
        assert res.status_code == 401

    def test_login_admin_user_returns_is_admin_true(self, client, admin_user):
        res = client.post("/api/auth/login", json={
            "email": admin_user.email,
            "password": "admin1234",
        })
        assert res.status_code == 200
        assert res.json()["user"]["is_admin"] is True

    def test_login_email_case_insensitive(self, client, admin_user):
        res = client.post("/api/auth/login", json={
            "email": admin_user.email.upper(),
            "password": "admin1234",
        })
        assert res.status_code == 200
        assert res.json()["user"]["email"] == admin_user.email.lower()

    def test_login_short_password_works(self, client):
        # Registramos con password corto y luego logueamos
        client.post("/api/auth/register", json={
            "email": "short@test.cl",
            "password": "1234",
        })
        res = client.post("/api/auth/login", json={
            "email": "short@test.cl",
            "password": "1234",
        })
        assert res.status_code == 200
