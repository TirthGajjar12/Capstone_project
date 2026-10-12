import time
import logging
from functools import wraps

logger = logging.getLogger("app.performance")
logging.basicConfig(level=logging.INFO)

def measure_execution_time(func):
    """
    Decorator that calculates execution time of functions
    and logs warnings if an operation is slow (>500ms).
    Demonstrates functools.wraps and Python decorators.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            duration_ms = (time.perf_counter() - start_time) * 1000
            if duration_ms > 500:
                logger.warning(f"SLOW OPERATION: {func.__name__} took {duration_ms:.2f}ms")
            else:
                logger.info(f"{func.__name__} executed in {duration_ms:.2f}ms")
    return wrapper
