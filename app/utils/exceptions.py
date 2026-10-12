class ITAssetManagerException(Exception):
    """Base exception for all domain errors."""
    def __init__(self, message: str): #this is internal exeception class
        self.message = message
        super().__init__(self.message) #and this is the main class that we want to 

class InvalidStatusTransitionError(ITAssetManagerException):
    """Raised when an illegal ticket status transition is attempted."""
    pass

class AssetUnavailableError(ITAssetManagerException):
    """Raised when trying to assign an asset that is not AVAILABLE."""
    pass

class ResourceNotFoundError(ITAssetManagerException):
    """Raised when an asset, ticket, or user is not found."""
    pass
