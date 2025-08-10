from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, Dict, Any
import numpy as np
import pandas as pd

from src.features.indicators import build_feature_frame, last_swing_levels


@dataclass
class Signal:
    timestamp: pd.Timestamp
    symbol: str
    direction: Optional[str]  # "long", "short", or None
    confidence: float  # 0..1
    entry: float
    stop: Optional[float]
    take_profit: Optional[float]
    context: Dict[str, Any]


def _compute_scores(row: pd.Series) -> tuple[int, int]:
    bull = 0
    bear = 0

    # Trend/TA
    bull += int(row.get("above_ema50", 0) == 1)
    bull += int(row.get("above_ema200", 0) == 1)
    bull += int(row.get("rsi14", 0) > 55)

    bear += int(row.get("above_ema50", 0) == 0)
    bear += int(row.get("above_ema200", 0) == 0)
    bear += int(row.get("rsi14", 100) < 45)

    # Structure / SMC
    bull += int(row.get("bos_up", 0) == 1)
    bear += int(row.get("bos_down", 0) == 1)

    # Wyckoff
    bull += int(row.get("is_accumulation", 0) == 1)
    bear += int(row.get("is_distribution", 0) == 1)

    # Liquidity sweeps: grab-down favors long, grab-up favors short
    bull += int(row.get("liq_grab_down", 0) == 1)
    bear += int(row.get("liq_grab_up", 0) == 1)

    # Demand/Supply interaction
    price = row["close"]
    demand_low = row.get("demand_low", np.nan)
    supply_high = row.get("supply_high", np.nan)
    if not np.isnan(demand_low) and price > demand_low:
        bull += 1
    if not np.isnan(supply_high) and price < supply_high:
        bear += 1

    return bull, bear


def _risk_targets(row: pd.Series, swing_low: float | None, swing_high: float | None, rr: float = 1.5) -> tuple[Optional[float], Optional[float]]:
    price = float(row["close"])
    atr = float(row.get("atr14", np.nan)) if not np.isnan(row.get("atr14", np.nan)) else None

    # Defaults
    long_stop = swing_low if swing_low is not None else (price - (atr * 1.2 if atr else price * 0.01))
    short_stop = swing_high if swing_high is not None else (price + (atr * 1.2 if atr else price * 0.01))

    long_tp = price + (price - long_stop) * rr if long_stop is not None else None
    short_tp = price - (short_stop - price) * rr if short_stop is not None else None

    return (float(long_stop) if long_stop is not None else None, float(long_tp) if long_tp is not None else None), (
        float(short_stop) if short_stop is not None else None,
        float(short_tp) if short_tp is not None else None,
    )


def generate_latest_signal(symbol: str, df: pd.DataFrame, htf_row: pd.Series | None = None, target_rr: float = 1.5, require_htf: bool = False) -> Signal:
    feats = build_feature_frame(df)
    row = feats.iloc[-1]

    # HTF confirmation logic if provided
    if require_htf and htf_row is not None:
        # If HTF is bearish trend and distribution, avoid longs; vice versa
        if int(htf_row.get("above_ema200", 1)) == 0 and int(htf_row.get("is_distribution", 0)) == 1:
            row["htf_bias"] = -1
        elif int(htf_row.get("above_ema200", 0)) == 1 and int(htf_row.get("is_accumulation", 0)) == 1:
            row["htf_bias"] = 1
        else:
            row["htf_bias"] = 0
    else:
        row["htf_bias"] = 0

    bull, bear = _compute_scores(row)

    # Apply HTF bias softly
    bull += int(row["htf_bias"] == 1)
    bear += int(row["htf_bias"] == -1)

    total = bull + bear if (bull + bear) > 0 else 1

    direction: Optional[str]
    if bull > bear + 1:
        direction = "long"
    elif bear > bull + 1:
        direction = "short"
    else:
        direction = None

    confidence = max(bull, bear) / (total * 1.0)

    swing_low, swing_high = last_swing_levels(feats)
    (long_stop, long_tp), (short_stop, short_tp) = _risk_targets(row, swing_low, swing_high, rr=target_rr)

    if direction == "long":
        stop = long_stop
        tp = long_tp
    elif direction == "short":
        stop = short_stop
        tp = short_tp
    else:
        stop = None
        tp = None

    context = {
        "bull_score": bull,
        "bear_score": bear,
        "ema50": float(row.get("ema50", np.nan)),
        "ema200": float(row.get("ema200", np.nan)),
        "rsi14": float(row.get("rsi14", np.nan)),
        "atr14": float(row.get("atr14", np.nan)),
        "bos_up": int(row.get("bos_up", 0)),
        "bos_down": int(row.get("bos_down", 0)),
        "is_accumulation": int(row.get("is_accumulation", 0)),
        "is_distribution": int(row.get("is_distribution", 0)),
        "liq_grab_up": int(row.get("liq_grab_up", 0)),
        "liq_grab_down": int(row.get("liq_grab_down", 0)),
        "htf_bias": int(row.get("htf_bias", 0)),
    }

    return Signal(
        timestamp=feats.index[-1],
        symbol=symbol,
        direction=direction,
        confidence=float(confidence),
        entry=float(row["close"]),
        stop=stop,
        take_profit=tp,
        context=context,
    )