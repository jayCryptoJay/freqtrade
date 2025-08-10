from __future__ import annotations
from typing import Any
import pandas as pd


def fetch_ohlcv_dataframe(exchange: Any, symbol: str, timeframe: str, limit: int = 750) -> pd.DataFrame:
    raw = exchange.fetch_ohlcv(symbol=symbol, timeframe=timeframe, limit=limit)
    # Columns: timestamp(ms), open, high, low, close, volume
    df = pd.DataFrame(raw, columns=["timestamp", "open", "high", "low", "close", "volume"])
    df["time"] = pd.to_datetime(df["timestamp"], unit="ms", utc=True)
    df = df.set_index("time", drop=True).sort_index()
    numeric_cols = ["open", "high", "low", "close", "volume"]
    df[numeric_cols] = df[numeric_cols].astype(float)
    return df