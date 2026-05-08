import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.services.auth_service import hash_password, verify_password, create_access_token
from app.services.email_service import (
    send_verification_email,
    send_welcome_email,
    send_password_reset_email,
)


PASSWORD_RESET_TTL_HOURS = 1

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email:    str
    password: str


class RegisterRequest(BaseModel):
    email:             str
    password:          str
    is_company:        bool = False
    rut:               Optional[str] = None
    business_name:     Optional[str] = None
    business_activity: Optional[str] = None


class UserOut(BaseModel):
    id:                int
    email:             str
    is_company:        bool
    is_admin:          bool = False
    email_verified:    bool = False
    rut:               Optional[str] = None
    business_name:     Optional[str] = None
    business_activity: Optional[str] = None
    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserOut


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email, User.is_active == True).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    return TokenResponse(
        access_token=create_access_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse, status_code=201)
def register_user(
    payload: RegisterRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="El email ya está registrado")

    token = secrets.token_urlsafe(32)
    user = User(
        email              = payload.email,
        hashed_password    = hash_password(payload.password),
        is_company         = payload.is_company,
        rut                = payload.rut,
        business_name      = payload.business_name,
        business_activity  = payload.business_activity,
        email_verified     = False,
        verification_token = token,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    background_tasks.add_task(send_verification_email, user.email, token)

    return TokenResponse(
        access_token=create_access_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=404, detail="Token inválido o ya utilizado")
    user.email_verified     = True
    user.verification_token = None
    db.commit()
    name = user.business_name or user.email
    send_welcome_email(user.email, name)
    return {"message": "Correo verificado exitosamente"}


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Siempre responde 200 para no revelar si el email existe.
    Si el usuario existe y está activo, genera un token de reset y manda email.
    """
    generic_response = {
        "message": "Si el email está registrado, recibirás un enlace para restablecer tu contraseña.",
    }

    email = (payload.email or "").strip().lower()
    if not email:
        return generic_response

    user = db.query(User).filter(User.email == email, User.is_active == True).first()
    if not user:
        return generic_response

    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({PasswordResetToken.used_at: datetime.now(timezone.utc)})

    token_value = secrets.token_urlsafe(32)
    reset = PasswordResetToken(
        token=token_value,
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=PASSWORD_RESET_TTL_HOURS),
    )
    db.add(reset)
    db.commit()

    background_tasks.add_task(send_password_reset_email, user.email, token_value)
    return generic_response


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token == payload.token)
        .first()
    )
    if not reset or not reset.is_valid():
        raise HTTPException(status_code=400, detail="Token inválido o expirado")

    user = db.query(User).filter(User.id == reset.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")

    user.hashed_password = hash_password(payload.new_password)
    reset.used_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Contraseña actualizada correctamente"}


@router.post("/resend-verification")
def resend_verification(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(__import__('app.services.auth_service', fromlist=['get_current_user']).get_current_user),
):
    if current_user.email_verified:
        raise HTTPException(400, "El correo ya está verificado")
    token = secrets.token_urlsafe(32)
    current_user.verification_token = token
    db.commit()
    background_tasks.add_task(send_verification_email, current_user.email, token)
    return {"message": "Email de verificación reenviado"}
