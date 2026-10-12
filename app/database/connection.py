from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings

# 1. Create the SQLAlchemy Engine
# pool_pre_ping=True checks if the MySQL connection is still alive before using it
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    echo=settings.DEBUG  # Prints raw SQL statements to terminal during development
)

# 2. Create the SessionLocal factory
# Each request will get its own separate database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Dependency: provides a database session to FastAPI routes and cleanly closes it
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
