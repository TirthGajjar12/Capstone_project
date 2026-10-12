import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.database.connection import get_db
from app.main import app
from app.models.user import User
from app.utils.security import hash_password

# Use in-memory SQLite for test isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables before tests run, tear down after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    """Provides a transactional database session per test."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()

@pytest.fixture
def client(db_session):
    """Overrides get_db dependency with test database session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def admin_token(client, db_session):
    """Seeds an admin user if not exists and returns a valid Bearer token."""
    admin = db_session.query(User).filter(User.email == "test_admin@company.com").first()
    if not admin:
        admin = User(
            email="test_admin@company.com",
            full_name="Test Admin",
            hashed_password=hash_password("adminpass123"),
            role="ADMIN",
            is_active=True
        )
        db_session.add(admin)
        db_session.commit()

    response = client.post("/auth/login", data={"username": "test_admin@company.com", "password": "adminpass123"})
    return response.json()["access_token"]

@pytest.fixture
def employee_token(client, db_session):
    """Seeds an employee user if not exists and returns a valid Bearer token."""
    emp = db_session.query(User).filter(User.email == "test_emp@company.com").first()
    if not emp:
        emp = User(
            email="test_emp@company.com",
            full_name="Test Employee",
            hashed_password=hash_password("emppass123"),
            role="EMPLOYEE",
            is_active=True
        )
        db_session.add(emp)
        db_session.commit()

    response = client.post("/auth/login", data={"username": "test_emp@company.com", "password": "emppass123"})
    return response.json()["access_token"]
