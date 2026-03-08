import httpx
import pandas as pd
from datetime import datetime
from typing import Optional
import asyncio
from collections import OrderedDict

BINANCE_BASE = "https://api.binance.com/api/v3"
BYBIT_BASE = "https://api.bybit.com/v5/market"

TIMEFRAME_MAP = {
    "15m": {"binance": "15m", "bybit": "15",  "ms": 15 * 60 * 1000},
    "1h":  {"binance": "1h",  "bybit": "60",  "ms": 60 * 60 * 1000},
    "4h":  {"binance": "4h",  "bybit": "240", "ms": 4 * 60 * 60 * 1000},
}

# LRU cache with TTL: {key: (df, fetched_at)}
_CACHE_MAX = 50
_CACHE_TTL = 300  # seconds
_cache: OrderedDict = OrderedDict()


def _cache_key(symbol: str, timeframe: str, start: Optional[str], end: Optional[str], days_back: int) -> str:
    return f"{symbol}_{timeframe}_{start}_{end}_{days_back}"


def _cache_get(key: str) -> Optional[pd.DataFrame]:
    if key not in _cache:
        return None
    df, fetched_at = _cache[key]
    if (datetime.utcnow() - fetched_at).total_seconds() > _CACHE_TTL:
        del _cache[key]
        return None
    # Move to end (LRU)
    _cache.move_to_end(key)
    return df


def _cache_put(key: str, df: pd.DataFrame):
    _cache[key] = (df, datetime.utcnow())
    _cache.move_to_end(key)
    # Evict oldest when over limit
    while len(_cache) > _CACHE_MAX:
        _cache.popitem(last=False)


async def _fetch_binance_page(
    symbol: str,
    timeframe: str,
    start_time: int,
    end_time: int,
) -> list[list]:
    tf = TIMEFRAME_MAP.get(timeframe, TIMEFRAME_MAP["1h"])
    params = {
        "symbol": symbol,
        "interval": tf["binance"],
        "startTime": start_time,
        "endTime": end_time,
        "limit": 1000,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{BINANCE_BASE}/klines", params=params)
        resp.raise_for_status()
        return resp.json()


async def _fetch_bybit_page(
    symbol: str,
    timeframe: str,
    start_ms: int,
    end_ms: int,
) -> list[list]:
    tf = TIMEFRAME_MAP.get(timeframe, TIMEFRAME_MAP["1h"])
    params = {
        "category": "spot",
        "symbol": symbol,
        "interval": tf["bybit"],
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

    result = []
    for candle in data["result"]["list"]:
        ts, o, h, l, c, vol = candle[0], candle[1], candle[2], candle[3], candle[4], candle[5]
        result.append([int(ts), o, h, l, c, vol, ts, "0", "0", "0", "0", "0"])
    return sorted(result, key=lambda x: x[0])


async def fetch_ohlcv_dataframe(
    timeframe: str = "1h",
    days_back: int = 180,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    symbol: str = "SOLUSDT",
) -> pd.DataFrame:
    """
    Fetch OHLCV data for any symbol with LRU + TTL caching and Bybit fallback.
    Automatically paginates until all requested candles are fetched.
    """
    key = _cache_key(symbol, timeframe, start_date, end_date, days_back)
    cached = _cache_get(key)
    if cached is not None:
        return cached

    tf_config = TIMEFRAME_MAP.get(timeframe, TIMEFRAME_MAP["1h"])
    interval_ms = tf_config["ms"]
    now_ms = int(datetime.utcnow().timestamp() * 1000)

    start_ms = (
        int(datetime.fromisoformat(start_date).timestamp() * 1000)
        if start_date
        else now_ms - days_back * 24 * 60 * 60 * 1000
    )
    end_ms = (
        int(datetime.fromisoformat(end_date).timestamp() * 1000)
        if end_date
        else now_ms
    )

    all_candles: list[list] = []
    current = start_ms

    for _ in range(25):  # safety cap
        if current >= end_ms:
            break

        try:
            page = await _fetch_binance_page(symbol, timeframe, current, end_ms)
        except Exception:
            try:
                page = await _fetch_bybit_page(symbol, timeframe, current, end_ms)
            except Exception:
                break

        if not page:
            break

        all_candles.extend(page)
        current = int(page[-1][0]) + interval_ms

        if len(page) < 999:
            break

        await asyncio.sleep(0.08)

    if not all_candles:
        raise ValueError(f"No OHLCV data returned for {symbol} {timeframe}")

    df = pd.DataFrame(all_candles, columns=[
        "timestamp", "open", "high", "low", "close", "volume",
        "close_time", "quote_volume", "trades", "taker_buy_base",
        "taker_buy_quote", "ignore",
    ])
    df = df[["timestamp", "open", "high", "low", "close", "volume"]].copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms", utc=True)
    df = df.set_index("timestamp")
    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col])
    df = df[~df.index.duplicated(keep="last")].sort_index()

    _cache_put(key, df)
    return df
