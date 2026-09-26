import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Load root .env
root_env = Path(__file__).resolve().parent.parent.parent / ".env"
if root_env.exists():
    load_dotenv(root_env)

class Settings(BaseModel):
    DB_HOST: str = os.getenv("DB_HOST", "aws-0-ap-southeast-2.pooler.supabase.com")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_USER: str = os.getenv("DB_USER", "postgres.syorhfpfkrorshiskbmn")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "anujselokar")
    DB_NAME: str = os.getenv("DB_NAME", "postgres")
    DB_SSLMODE: str = os.getenv("DB_SSLMODE", "require")
    
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-fintech-jwt-key-2026-vcs-r2")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 72

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

settings = Settings()
