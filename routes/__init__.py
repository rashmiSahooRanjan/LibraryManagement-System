"""Routes package initialization"""
from .auth import auth_bp
from .books import books_bp
from .members import members_bp
from .issue import issue_bp
from .settings import settings_bp
from .member import member_bp
from .payments import payments_bp

__all__ = ['auth_bp', 'books_bp', 'members_bp', 'issue_bp', 'settings_bp', 'member_bp', 'payments_bp']
