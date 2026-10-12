from sqlalchemy.orm import declarative_base #imports a function that creates a base class for your SQLAlchemy database models.

# All SQLAlchemy models (User, Asset, Ticket) will inherit from this Base
Base = declarative_base()
