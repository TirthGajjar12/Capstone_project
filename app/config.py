from pydantic import model_validator, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "IT Asset & Support Ticket Management"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # Database Settings
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "it_asset_db"
    DB_SSLMODE: str = ""
    DATABASE_URL_ENV: str = Field(default="", validation_alias="DATABASE_URL")

    # Security Settings
    SECRET_KEY: str = "dev_insecure_secret_key_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    RSA_PRIVATE_KEY_PATH: str = "keys/rsa_private.pem"
    RSA_PRIVATE_KEY_PEM: str = ""

    # CORS Allowed Origins (comma-separated list for production configuration)
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"

    # Modern Pydantic V2 configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

    @model_validator(mode="after")
    def validate_security(self):
        """Enforces that production deployments do not rely on default or publicly committed keys."""
        if self.APP_ENV.lower() in ("production", "prod"):
            insecure_defaults = {
                "default_secret_key",
                "dev_insecure_secret_key_change_in_production",
            }
            if not self.SECRET_KEY or self.SECRET_KEY in insecure_defaults or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "FATAL: In production (APP_ENV=production), SECRET_KEY must be a cryptographically secure random string (at least 32 characters) provided via environment variables."
                )
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        """Returns trusted frontend origins as a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


    @property
    def database_url(self) -> str:
        """Constructs PostgreSQL SQLAlchemy connection string or normalizes DATABASE_URL."""
        if self.DATABASE_URL_ENV:
            url = self.DATABASE_URL_ENV
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+psycopg2://", 1)
            elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
            return url
        ssl = f"?sslmode={self.DB_SSLMODE}" if self.DB_SSLMODE else ""
        return f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}{ssl}"

    @property
    def DATABASE_URL(self) -> str:
        """Alias for database_url supporting standard 12-factor uppercase environment conventions."""
        return self.database_url

settings = Settings()
