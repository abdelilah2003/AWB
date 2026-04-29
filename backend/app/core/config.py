import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_NAME: str = os.getenv("DB_NAME", "catalog_AWB")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "password")
    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")
    MISTRAL_MODEL: str = os.getenv("MISTRAL_MODEL", "mistral-medium-latest")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    MINIO_ENDPOINT: str = os.getenv("ENDPOINT", "")
    MINIO_ACCESS_KEY: str = os.getenv("ACCESS_KEY", "")
    MINIO_SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    MINIO_BUCKET: str = os.getenv("BUCKET", "app-reports")

settings = Settings()
