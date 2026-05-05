"""Tests unitarios puros — sin DB ni HTTP."""
import pytest
from jose import jwt, JWTError

from app.services.auth_service import hash_password, verify_password, create_access_token
from app.core.config import settings


class TestPasswordHashing:
    def test_hash_differs_from_plain(self):
        hashed = hash_password("mi_password")
        assert hashed != "mi_password"

    def test_bcrypt_prefix(self):
        hashed = hash_password("test")
        assert hashed.startswith("$2b$")

    def test_verify_correct_password(self):
        plain = "password_seguro_123"
        assert verify_password(plain, hash_password(plain)) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("password_correcto")
        assert verify_password("password_incorrecto", hashed) is False

    def test_two_hashes_of_same_password_differ(self):
        # bcrypt usa salt aleatorio
        h1 = hash_password("mismo_password")
        h2 = hash_password("mismo_password")
        assert h1 != h2
        # Pero ambos verifican correctamente
        assert verify_password("mismo_password", h1) is True
        assert verify_password("mismo_password", h2) is True

    def test_empty_password(self):
        hashed = hash_password("")
        assert verify_password("", hashed) is True
        assert verify_password(" ", hashed) is False


class TestJWT:
    def test_token_contains_user_id(self):
        token = create_access_token(42)
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["sub"] == "42"

    def test_token_has_expiry(self):
        token = create_access_token(1)
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert "exp" in payload

    def test_different_users_get_different_tokens(self):
        t1 = create_access_token(1)
        t2 = create_access_token(2)
        assert t1 != t2

    def test_invalid_token_raises(self):
        with pytest.raises(JWTError):
            jwt.decode("token.invalido.aqui", settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

    def test_tampered_token_raises(self):
        token = create_access_token(1)
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(JWTError):
            jwt.decode(tampered, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
