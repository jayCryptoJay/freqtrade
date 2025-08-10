from typing import Any
import ccxt  # type: ignore


def create_exchange(exchange_id: str, api_key: str | None = None, api_secret: str | None = None, sandbox: bool = False) -> Any:
    if not hasattr(ccxt, exchange_id):
        raise ValueError(f"Unknown exchange id: {exchange_id}")
    klass = getattr(ccxt, exchange_id)
    params: dict[str, Any] = {
        "enableRateLimit": True,
        "options": {},
    }
    if api_key and api_secret:
        params["apiKey"] = api_key
        params["secret"] = api_secret

    exchange = klass(params)

    # Some exchanges support sandbox toggle
    try:
        exchange.set_sandbox_mode(bool(sandbox))
    except Exception:
        pass

    return exchange