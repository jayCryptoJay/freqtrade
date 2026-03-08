import httpx
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional
import asyncio

BINANCE_BASE = "https://api.binance.com/api/v3"
BYBIT_BASE = "https://api.bybit.com/v5/market"

TIMEFRAME_MAP = {
    "15m": {"binance": "15m", "ms": 15 * 60 * 1000, "limit": 1000},
    "1h": {"binance": "1h", "ms": 60 * 60 * 1000, "limit": 1000},
    "4h": {"binance": "4h", "ms": 4 * 60 * 60 * 1000, "limit": 1000},
}

# In-memory cache: (symbol, timeframe, start, end) -> DataFrame
_cache: dict = {}


def _cache_key(timeframe: str, start: Optional[str], end: Optional[str]) -> str:
    return f"SOLUSDT_{timeframe}_{start}_{end}"


async def fetch_binance_ohlcv(
    timeframe: str,
    start_time: Optional[int] = None,
    end_time: Optional[int] = None,
    limit: int = 1000,
) -> list[list]:
    """Fetch OHLCV data from Binance."""
    tf_config = TIMEFRAME_MAP.get(timeframe, TIMEFRAME_MAP["1h"])
    params = {
        "symbol": "SOLUSDT",
        "interval": tf_config["binance"],
        "limit": limit,
    }
    if start_time:
        params["startTime"] = start_time
    if end_time:
        params["endTime"] = end_time

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{BINANCE_BASE}/klines", params=params)
        resp.raise_for_status()
        return resp.json()


async def fetch_ohlcv_dataframe(
    timeframe: str = "1h",
    days_back: int = 180,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> pd.DataFrame:
    """
    Fetch SOL/USDT OHLCV data and return as DataFrame.
    Automatically paginates to get enough data.
    """
    cache_key = _cache_key(timeframe, start_date, end_date)
    if cache_key in _cache:
        cached_df, cached_at = _cache[cache_key]
        if (datetime.utcnow() - cached_at).seconds < 300:
            return cached_df

    tf_config = TIMEFRAME_MAP.get(timeframe, TIMEFRAME_MAP["1h"])
    interval_ms = tf_config["ms"]

    now_ms = int(datetime.utcnow().timestamp() * 1000)

    if start_date:
        start_ms = int(datetime.fromisoformat(start_date).timestamp() * 1000)
    else:
        start_ms = now_ms - days_back * 24 * 60 * 60 * 1000

    if end_date:
        end_ms = int(datetime.fromisoformat(end_date).timestamp() * 1000)
    else:
        end_ms = now_ms

    all_candles = []
    current_start = start_ms
    max_iterations = 20  # safety

    for _ in range(max_iterations):
        if current_start >= end_ms:
            break

        try:
            candles = await fetch_binance_ohlcv(
                timeframe,
                start_time=current_start,
                end_time=end_ms,
                limit=1000,
            )
        except Exception:
            # Fallback to Bybit
            candles = await _fetch_bybit_fallback(timeframe, current_start, end_ms)

        if not candles:
            break

        all_candles.extend(candles)

        last_ts = int(candles[-1][0])
        current_start = last_ts + interval_ms

        if len(candles) < 999:
            break

        await asyncio.sleep(0.1)  # rate limit courtesy

    if not all_candles:
        raise ValueError("No OHLCV data returned from API")

    df = pd.DataFrame(all_candles, columns=[
        "timestamp", "open", "high", "low", "close", "volume",
        "close_time", "quote_volume", "trades", "taker_buy_base",
        "taker_buy_quote", "ignore"
    ])

    df = df[["timestamp", "open", "high", "low", "close", "volume"]].copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms", utc=True)
    df = df.set_index("timestamp")
    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col])

    df = df[~df.index.duplicated(keep="last")].sort_index()

    _cache[cache_key] = (df, datetime.utcnow())
    return df


async def _fetch_bybit_fallback(timeframe: str, start_ms: int, end_ms: int) -> list:
    """Fallback to Bybit API."""
    interval_map = {"15m": "15", "1h": "60", "4h": "240"}
    interval = interval_map.get(timeframe, "60")

    params = {
        "category": "spot",
        "symbol": "SOLUSDT",
        "interval": interval,
        "start": start_ms,
        "end": end_ms,
        "limit": 1000,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{BYBIT_BASE}/kline", params=params)
        resp.raise_for_status()
        data = resp.json()

    if data.get("retCode") != 0:
        return []

    # Bybit returns [timestamp, open, high, low, close, volume, turnover]
    # Convert to Binance format: [ts, o, h, l, c, vol, ...]
    result = []
    for candle in data["result"]["list"]:
        ts, o, h, l, c, vol = candle[0], candle[1], candle[2], candle[3], candle[4], candle[5]
        result.append([int(ts), o, h, l, c, vol, ts, "0", "0", "0", "0", "0"])

    return sorted(result, key=lambda x: x[0])
