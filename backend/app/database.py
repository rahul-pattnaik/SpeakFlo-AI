from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.engine import make_url

from .core.config import settings

if not settings.database_url:
    raise RuntimeError("DATABASE_URL is not configured.")

connect_args = {}
if settings.database_url.startswith("postgresql"):
    parsed_url = make_url(settings.database_url)
    hostname = parsed_url.host or ""
    local_hosts = {"localhost", "127.0.0.1"}
    if hostname not in local_hosts:
        connect_args["sslmode"] = settings.database_ssl_mode

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args=connect_args,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    Base.metadata.create_all(bind=engine)

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
        """
        CREATE TABLE IF NOT EXISTS coach_interactions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            mode VARCHAR(50) NOT NULL,
            user_input TEXT NOT NULL,
            agent_response TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS weak_words (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            word VARCHAR(100) NOT NULL,
            error_count INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        """,
        "CREATE INDEX IF NOT EXISTS ix_coach_interactions_user_id ON coach_interactions(user_id)",
        "CREATE INDEX IF NOT EXISTS ix_weak_words_user_id ON weak_words(user_id)",
        "CREATE INDEX IF NOT EXISTS ix_weak_words_word ON weak_words(word)",
    ]

    with engine.begin() as connection:
        for statement in migration_statements:
            connection.execute(text(statement))
