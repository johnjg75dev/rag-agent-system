"""Authentication utilities."""
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from backend.config import settings
import hashlib
import secrets


def create_session_cookie() -> str:
    """Generate a random session token."""
    return secrets.token_urlsafe(32)


def verify_credentials(username: str, password: str) -> bool:
    """Verify the admin credentials."""
    return username == settings.admin_username and password == settings.admin_password
