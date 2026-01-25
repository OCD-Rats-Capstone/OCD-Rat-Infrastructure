"""
Centralized configuration using Pydantic BaseSettings.
All environment variables are loaded once and validated here.
"""

import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database configuration
    db_host: str = "localhost"
    db_name: str = "postgres"
    db_user: str = "postgres"
    db_password: str = ""
    db_port: str = "5432"
    
    # LLM configuration (requires cloud API keys in .env)
    openai_api_key: str = ""
    llm_base_url: str = ""
    llm_model: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """
    Returns cached settings instance.
    Uses lru_cache to avoid re-reading environment on every request.
    """
    return Settings()
