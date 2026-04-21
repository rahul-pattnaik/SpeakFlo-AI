import os

from dotenv import load_dotenv

load_dotenv()


def _read_frontend_origins():
    raw_origins = os.getenv("FRONTEND_ORIGINS")
    if raw_origins:
        return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


class Settings:
    database_url = os.getenv("DATABASE_URL")
    database_ssl_mode = os.getenv("DATABASE_SSL_MODE", "prefer")
    secret_key = os.getenv("SECRET_KEY", "speakflo-dev-secret-change-me")
    access_token_expire_seconds = int(os.getenv("ACCESS_TOKEN_EXPIRE_SECONDS", "900"))
    refresh_token_expire_seconds = int(
        os.getenv("REFRESH_TOKEN_EXPIRE_SECONDS", str(7 * 24 * 60 * 60))
    )
    frontend_origins = _read_frontend_origins()


settings = Settings()
