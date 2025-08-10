from __future__ import annotations
from typing import Tuple
import numpy as np
import pandas as pd

try:
    import pandas_ta as ta  # type: ignore
except Exception:  # pragma: no cover
    ta = None  # Allow library-free import; indicator funcs will guard on this


def _ensure_indicators(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    if ta is None:
        # Fallback simple calculations
        out["ema20"] = out["close"].ewm(span=20).mean()
        out["ema50"] = out["close"].ewm(span=50).mean()
        out["ema200"] = out["close"].ewm(span=200).mean()
        delta = out["close"].diff()
        gain = np.where(delta > 0, delta, 0.0)
        loss = np.where(delta < 0, -delta, 0.0)
        avg_gain = pd.Series(gain, index=out.index).rolling(14).mean()
        avg_loss = pd.Series(loss, index=out.index).rolling(14).mean()
        rs = avg_gain / (avg_loss.replace(0, np.nan))
        out["rsi14"] = 100 - (100 / (1 + rs))
        tr = np.maximum(out["high"] - out["low"], np.maximum((out["high"] - out["close"].shift()).abs(), (out["low"] - out["close"].shift()).abs()))
        out["atr14"] = pd.Series(tr, index=out.index).rolling(14).mean()
        out["obv"] = (np.sign(out["close"].diff().fillna(0)) * out["volume"]).cumsum()
    else:
        out["ema20"] = ta.ema(out["close"], length=20)
        out["ema50"] = ta.ema(out["close"], length=50)
        out["ema200"] = ta.ema(out["close"], length=200)
        out["rsi14"] = ta.rsi(out["close"], length=14)
        out["atr14"] = ta.atr(out["high"], out["low"], out["close"], length=14)
        out["obv"] = ta.obv(out["close"], out["volume"])  # type: ignore

    return out


def _swing_points(df: pd.DataFrame, lookback: int = 5) -> pd.DataFrame:
    out = df.copy()
    window = lookback if lookback % 2 == 1 else lookback + 1
    out["swing_high"] = (out["high"] == out["high"].rolling(window=window, center=True).max()).astype(int)
    out["swing_low"] = (out["low"] == out["low"].rolling(window=window, center=True).min()).astype(int)
    # Levels
    out["swing_high_level"] = np.where(out["swing_high"] == 1, out["high"], np.nan)
    out["swing_low_level"] = np.where(out["swing_low"] == 1, out["low"], np.nan)
    out["last_swing_high"] = pd.Series(out["swing_high_level"]).ffill()
    out["last_swing_low"] = pd.Series(out["swing_low_level"]).ffill()
    # Break of Structure (BOS)
    out["bos_up"] = (out["high"] > out["last_swing_high"].shift(1)).astype(int)
    out["bos_down"] = (out["low"] < out["last_swing_low"].shift(1)).astype(int)
    return out


def _order_blocks(df: pd.DataFrame, lookback: int = 20) -> pd.DataFrame:
    out = df.copy()
    demand_low = np.full(len(out), np.nan)
    demand_high = np.full(len(out), np.nan)
    supply_low = np.full(len(out), np.nan)
    supply_high = np.full(len(out), np.nan)

    closes = out["close"].values
    highs = out["high"].values
    lows = out["low"].values
    bos_up = out.get("bos_up", pd.Series([0]*len(out), index=out.index)).values
    bos_down = out.get("bos_down", pd.Series([0]*len(out), index=out.index)).values

    for i in range(len(out)):
        if i == 0:
            continue
        # After BOS up, find last bearish candle within lookback as demand zone
        if bos_up[i] == 1:
            start = max(0, i - lookback)
            reds = [j for j in range(start, i) if closes[j] < out["open"].iloc[j]]
            if len(reds) > 0:
                j = reds[-1]
                demand_low[i] = lows[j]
                demand_high[i] = out["open"].iloc[j]
        # After BOS down, find last bullish candle within lookback as supply zone
        if bos_down[i] == 1:
            start = max(0, i - lookback)
            greens = [j for j in range(start, i) if closes[j] > out["open"].iloc[j]]
            if len(greens) > 0:
                j = greens[-1]
                supply_low[i] = out["open"].iloc[j]
                supply_high[i] = highs[j]

    out["demand_low"] = pd.Series(demand_low, index=out.index).ffill()
    out["demand_high"] = pd.Series(demand_high, index=out.index).ffill()
    out["supply_low"] = pd.Series(supply_low, index=out.index).ffill()
    out["supply_high"] = pd.Series(supply_high, index=out.index).ffill()

    # Invalidation: drop zones when price closes through them decisively
    out.loc[out["close"] < out["demand_low"], ["demand_low", "demand_high"]] = np.nan
    out.loc[out["close"] > out["supply_high"], ["supply_low", "supply_high"]] = np.nan

    return out


def _wyckoff_heuristics(df: pd.DataFrame, window: int = 60) -> pd.DataFrame:
    out = df.copy()
    rolling_high = out["high"].rolling(window).max()
    rolling_low = out["low"].rolling(window).min()
    range_width = rolling_high - rolling_low
    range_mid = (rolling_high + rolling_low) / 2.0
    price = out["close"]

    atr = out.get("atr14")
    if atr is None or atr.isna().all():
        tr = np.maximum(out["high"] - out["low"], np.maximum((out["high"] - out["close"].shift()).abs(), (out["low"] - out["close"].shift()).abs()))
        atr = pd.Series(tr, index=out.index).rolling(14).mean()

    vol_sma = out["volume"].rolling(20).mean()

    # Range regime when width relative to price and ATR is small
    price_mean = price.rolling(window).mean()
    width_ratio = range_width / price_mean
    atr_ratio = atr / price_mean
    is_range = (width_ratio < 0.06) & (atr_ratio < 0.02)

    # Position within range
    position_in_range = (price - rolling_low) / (range_width.replace(0, np.nan))

    # Heuristics
    is_accumulation = is_range & (position_in_range < 0.3) & (out["rsi14"] < 50) & (out["volume"] > vol_sma)
    is_distribution = is_range & (position_in_range > 0.7) & (out["rsi14"] > 50) & (out["volume"] > vol_sma)

    out["is_range"] = is_range.astype(int)
    out["is_accumulation"] = is_accumulation.astype(int)
    out["is_distribution"] = is_distribution.astype(int)
    out["range_low"] = rolling_low
    out["range_high"] = rolling_high
    out["range_mid"] = range_mid

    return out


def build_feature_frame(df: pd.DataFrame) -> pd.DataFrame:
    out = _ensure_indicators(df)
    out = _swing_points(out, lookback=5)
    out = _order_blocks(out, lookback=20)
    out = _wyckoff_heuristics(out, window=60)

    # Trend context
    out["above_ema50"] = (out["close"] > out["ema50"]).astype(int)
    out["above_ema200"] = (out["close"] > out["ema200"]).astype(int)

    return out


def last_swing_levels(df: pd.DataFrame) -> Tuple[float | None, float | None]:
    low = df["last_swing_low"].iloc[-1]
    high = df["last_swing_high"].iloc[-1]
    return (None if np.isnan(low) else float(low), None if np.isnan(high) else float(high))