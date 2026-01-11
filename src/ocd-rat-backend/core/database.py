"""
Centralized database connection management.
Provides a dependency injection pattern for FastAPI routes.
"""

import psycopg2
from typing import Generator
from .config import get_settings


def get_db() -> Generator:
    """
    FastAPI dependency that provides a database connection.
    Automatically closes the connection when the request completes.
    
    Usage:
        @router.get("/")
        def my_route(db = Depends(get_db)):
            cursor = db.cursor()
            ...
    """
    settings = get_settings()
    conn = None
    try:
        conn = psycopg2.connect(
            host=settings.db_host,
            database=settings.db_name,
            user=settings.db_user,
            password=settings.db_password,
            port=settings.db_port
        )
        yield conn
    finally:
        if conn:
            conn.close()
