import requests
from typing import Dict, Any
from app.utils.decorators import measure_execution_time

EXTERNAL_IP_API_URL = "http://ip-api.com/json"

@measure_execution_time
def fetch_ip_network_info(ip_address: str = "") -> Dict[str, Any]:
    """
    Consumes external network API with full error handling (README Section 14):
    - Success
    - Timeout handling
    - Connection error handling
    - HTTP status error handling
    """
    url = f"{EXTERNAL_IP_API_URL}/{ip_address}" if ip_address else EXTERNAL_IP_API_URL

    try:
        # Enforce 3-second timeout so external latency never hangs our app
        response = requests.get(url, timeout=3.0)
        
        # Raise exception for 4xx / 5xx HTTP responses
        response.raise_for_status()

        data = response.json()
        if data.get("status") == "fail":
            return {
                "success": False,
                "error": "Invalid IP address or query failed",
                "message": data.get("message", "Unknown error")
            }

        return {
            "success": True,
            "ip": data.get("query"),
            "country": data.get("country"),
            "region": data.get("regionName"),
            "city": data.get("city"),
            "isp": data.get("isp"),
            "org": data.get("org"),
            "timezone": data.get("timezone")
        }

    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "TimeoutError",
            "message": "External network API timed out after 3 seconds."
        }
    except requests.exceptions.ConnectionError:
        return {
            "success": False,
            "error": "ConnectionError",
            "message": "Failed to connect to external network service."
        }
    except requests.exceptions.HTTPError as e:
        return {
            "success": False,
            "error": "HTTPError",
            "message": f"External API returned HTTP error: {str(e)}"
        }
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "error": "RequestException",
            "message": f"Unexpected request failure: {str(e)}"
        }
