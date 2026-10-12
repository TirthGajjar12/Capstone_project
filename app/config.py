from pydantic_settings import BaseSettings, SettingsConfigDict #BaseSettings gives your class the ability to load and validate application settings.#SettingsConfigDict lets you specify configuration options for how that loading and validation should work

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

    # Security Settings
    SECRET_KEY: str = "default_secret_key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Modern Pydantic V2 configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore" # This tells Pydantic: "If you see variables in the .env file that aren't defined as fields in the Settings class, just ignore them and don't throw an error."
    )

    @property #we use @property when we want to access a method like an attribute, without parentheses
    def database_url(self) -> str:
        """Constructs MySQL SQLAlchemy connection string."""
        return f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

settings = Settings()
