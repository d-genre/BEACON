import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Automatically load environment variables from .env file if python-dotenv is installed
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./beacon.db"
)

# Fix SQLAlchemy dialect prefix if user passes 'postgres://' instead of 'postgresql://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Configure engine options based on driver
engine_kwargs = {"pool_pre_ping": True}

try:
    if "sqlite" not in DATABASE_URL:
        # Test connection to the configured database
        test_engine = create_engine(DATABASE_URL, **engine_kwargs)
        with test_engine.connect() as conn:
            pass
        engine = test_engine
        print(f"[DATABASE INFO] Connected successfully to remote database: {DATABASE_URL.split('@')[-1]}")
    else:
        raise ValueError("SQLite fallback forced")
except Exception as e:
    print(f"[DATABASE WARNING] Connection to configured database failed ({e}). Falling back to local SQLite!")
    DATABASE_URL = "sqlite:///./beacon.db"
    engine_kwargs = {"connect_args": {"check_same_thread": False}}
    engine = create_engine(DATABASE_URL, **engine_kwargs)

# Enforce foreign key constraints for SQLite
from sqlalchemy import event
from sqlalchemy.engine import Engine

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
