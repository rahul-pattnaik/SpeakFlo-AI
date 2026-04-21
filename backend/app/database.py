from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker

from .core.config import settings

if not settings.database_url:
    raise RuntimeError("DATABASE_URL is not configured.")


def _build_connect_args():
    database_url = settings.database_url
    if database_url.startswith("sqlite"):
        return {"check_same_thread": False}

    if database_url.startswith("postgresql"):
        parsed_url = make_url(database_url)
        hostname = parsed_url.host or ""
        local_hosts = {"localhost", "127.0.0.1"}
        if hostname not in local_hosts:
            return {"sslmode": settings.database_ssl_mode}

    return {}


engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args=_build_connect_args(),
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    from .models import User

    Base.metadata.create_all(bind=engine)

    if settings.database_url.startswith("sqlite"):
        return

    migration_statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE",
        "UPDATE users SET is_active = TRUE WHERE is_active IS NULL",
        "UPDATE users SET email_verified = FALSE WHERE email_verified IS NULL",
        "UPDATE users SET subscription_tier = 'free' WHERE subscription_tier IS NULL",
        "UPDATE users SET updated_at = created_at WHERE updated_at IS NULL",
    ]

    with engine.begin() as connection:
        for statement in migration_statements:
            connection.execute(text(statement))
