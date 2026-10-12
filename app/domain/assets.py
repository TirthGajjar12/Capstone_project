from abc import ABC, abstractmethod
from typing import Optional

class BaseAsset(ABC):
    """
    Abstract Base Class demonstrating OOP Encapsulation & Polymorphism.
    """
    def __init__(self, asset_tag: str, brand: str, model: str, serial_number: str):
        self._asset_tag = asset_tag          # Protected attribute (Encapsulation)
        self._brand = brand
        self._model = model
        self._serial_number = serial_number

    @property
    def asset_tag(self) -> str:
        return self._asset_tag

    @property
    def description(self) -> str:
        return f"{self._brand} {self._model} ({self._asset_tag})"

    @abstractmethod
    def maintenance_interval_months(self) -> int:
        """Polymorphic method implemented differently by each child asset class."""
        pass


class Laptop(BaseAsset):
    def __init__(self, asset_tag: str, brand: str, model: str, serial_number: str, ram_gb: int = 16):
        super().__init__(asset_tag, brand, model, serial_number)
        self.ram_gb = ram_gb

    def maintenance_interval_months(self) -> int:
        # Laptops need maintenance checkup every 6 months
        return 6


class Monitor(BaseAsset):
    def maintenance_interval_months(self) -> int:
        # Monitors checked every 12 months
        return 12


class Keyboard(BaseAsset):
    def maintenance_interval_months(self) -> int:
        # Peripherals checked every 24 months
        return 24


class Mouse(BaseAsset):
    def maintenance_interval_months(self) -> int:
        return 24


class Printer(BaseAsset):
    def maintenance_interval_months(self) -> int:
        # Printers checked frequently (every 3 months)
        return 3


# Factory Pattern to build polymorphic objects
def create_domain_asset(asset_type: str, asset_tag: str, brand: str, model: str, serial_number: str) -> BaseAsset:
    mapping = {
        "Laptop": Laptop,
        "Monitor": Monitor,
        "Keyboard": Keyboard,
        "Mouse": Mouse,
        "Printer": Printer
    }
    cls = mapping.get(asset_type)
    if not cls:
        raise ValueError(f"Unknown asset type: {asset_type}")
    return cls(asset_tag, brand, model, serial_number)
