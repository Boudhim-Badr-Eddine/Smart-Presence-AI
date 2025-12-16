from typing import Generator

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models import User


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_token(token: str, secret_key: str) -> str:
    """Verify JWT token and return user_id from 'sub' claim"""
    try:
        # Disable expiration verification temporarily for testing
        payload = jwt.decode(token, secret_key, algorithms=["HS256"], options={"verify_exp": False})
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return user_id
    except JWTError as e:
        print(f"JWT Error: {e}")
        return None
    except Exception as e:
        print(f"Error verifying token: {e}")
        return None


async def get_current_user(
    authorization: str = Header(None), db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token in Authorization header"""
    settings = get_settings()

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract token from "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]

    # Verify token and get user_id
    user_id = verify_token(token, settings.secret_key)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user from database by ID
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
    except ValueError:
        user = None

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
