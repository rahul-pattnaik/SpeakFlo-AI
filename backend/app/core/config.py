import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    database_url = os.getenv("DATABASE_URL")
    database_ssl_mode = os.getenv("DATABASE_SSL_MODE", "require")
    secret_key = os.getenv("SECRET_KEY", "speakflo-dev-secret-change-me")
    access_token_expire_seconds = int(os.getenv("ACCESS_TOKEN_EXPIRE_SECONDS", "900"))
    refresh_token_expire_seconds = int(
        os.getenv("REFRESH_TOKEN_EXPIRE_SECONDS", str(7 * 24 * 60 * 60))
    )
    openai_api_key = os.getenv("OPENAI_API_KEY")
    openai_base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    openai_text_model = os.getenv("OPENAI_TEXT_MODEL", "gpt-5.4-mini")
    frontend_api_base_url = os.getenv("FRONTEND_API_BASE_URL", "http://localhost:8000")
    frontend_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


settings = Settings()
