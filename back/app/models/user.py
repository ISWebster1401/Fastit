from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id                 = Column(Integer, primary_key=True, index=True)
    email              = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password    = Column(String, nullable=False)
    is_company         = Column(Boolean, default=False)
    is_admin           = Column(Boolean, default=False)
    is_active          = Column(Boolean, default=True)
    email_verified     = Column(Boolean, default=False)
    verification_token = Column(String(64), nullable=True, index=True)
    rut                = Column(String(20), nullable=True)
    business_name      = Column(String(255), nullable=True)
    business_activity  = Column(String(255), nullable=True)

    orders = relationship("Order", back_populates="user")
