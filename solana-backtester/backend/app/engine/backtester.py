import pandas as pd
import numpy as np
import traceback
import textwrap
from typing import Any
from .metrics import calculate_metrics


ALLOWED_IMPORTS = {
    "pandas", "pd", "numpy", "np", "math", "statistics",
}

SAFE_BUILTINS = {
    "abs", "all", "any", "bool", "dict", "enumerate", "filter",
    "float", "int", "isinstance", "len", "list", "map", "max",
    "min", "print", "range", "round", "set", "sorted", "str",
    "sum", "tuple", "type", "zip", "None", "True", "False",
}


def _safe_exec(code: str, df: pd.DataFrame) -> pd.Series:
    """Execute strategy code in a restricted namespace."""
    import pandas as _pd
    import numpy as _np
    import math as _math
    import statistics as _statistics

    namespace = {
        "pd": _pd,
        "pandas": _pd,
        "np": _np,
        "numpy": _np,
        "math": _math,
        "statistics": _statistics,
        "__builtins__": {k: __builtins__[k] for k in SAFE_BUILTINS if k in __builtins__}
        if isinstance(__builtins__, dict)
        else {k: getattr(__builtins__, k) for k in SAFE_BUILTINS if hasattr(__builtins__, k)},
    }

    exec(compile(code, "<strategy>", "exec"), namespace)

    if "strategy" not in namespace:
        raise ValueError("Strategy code must define a function named 'strategy(df)'")

    result = namespace["strategy"](df.copy())
    return result


def run_backtest(
    df: pd.DataFrame,
    strategy_code: str,
    leverage: float = 1.0,
    fee_rate: float = 0.001,
    initial_capital: float = 10000.0,
) -> dict[str, Any]:
    """
    Run the backtest engine.

    Returns metrics, equity curve, and trade log.
    """
    try:
        signals = _safe_exec(strategy_code, df)
    except Exception as e:
        raise ValueError(f"Strategy execution error: {traceback.format_exc()}")

    if not isinstance(signals, pd.Series):
        raise ValueError("Strategy must return a pandas Series")

    signals = signals.reindex(df.index).fillna(0).astype(int).clip(-1, 1)

    # Simulate trading
    capital = initial_capital
    position = 0  # 0 = flat, 1 = long, -1 = short
    entry_price = 0.0
    entry_time = None
    trades = []
    equity_curve = [capital]
    equity_timestamps = [df.index[0].isoformat() if hasattr(df.index[0], 'isoformat') else str(df.index[0])]

    prices = df["close"].values
    timestamps = df.index

    for i in range(1, len(df)):
        sig = int(signals.iloc[i])
        price = float(prices[i])
        ts = timestamps[i]

        if position == 0:
            # Enter trade
            if sig in (1, -1):
                position = sig
                entry_price = price * (1 + fee_rate * sig)  # slippage
                entry_time = ts
        elif position != sig and sig != 0:
            # Reverse or exit
            exit_price = price * (1 - fee_rate * position)
            raw_return = (exit_price - entry_price) / entry_price * position
            pnl_pct = raw_return * leverage
            pnl = capital * pnl_pct
            capital = max(capital + pnl, 0.01)  # prevent negative

            # Duration
            if hasattr(entry_time, 'to_pydatetime'):
                entry_dt = entry_time.to_pydatetime()
            else:
                entry_dt = pd.Timestamp(entry_time).to_pydatetime()
            if hasattr(ts, 'to_pydatetime'):
                exit_dt = ts.to_pydatetime()
            else:
                exit_dt = pd.Timestamp(ts).to_pydatetime()

            duration_hours = (exit_dt - entry_dt).total_seconds() / 3600

            trades.append({
                "entry_time": str(entry_time),
                "exit_time": str(ts),
                "side": "long" if position == 1 else "short",
                "entry_price": round(entry_price, 4),
                "exit_price": round(exit_price, 4),
                "pnl": round(pnl, 2),
                "pnl_pct": round(pnl_pct * 100, 3),
                "duration_hours": round(duration_hours, 2),
            })

            equity_curve.append(capital)
            equity_timestamps.append(ts.isoformat() if hasattr(ts, 'isoformat') else str(ts))

            # Enter new position if signal != 0
            if sig in (1, -1):
                position = sig
                entry_price = price * (1 + fee_rate * sig)
                entry_time = ts
            else:
                position = 0
                entry_price = 0.0
                entry_time = None
        elif position == sig:
            # Hold — record equity
            if position != 0:
                unrealized = (price - entry_price) / entry_price * position * leverage * capital
                equity_curve.append(capital + unrealized)
                equity_timestamps.append(ts.isoformat() if hasattr(ts, 'isoformat') else str(ts))
            else:
                equity_curve.append(capital)
                equity_timestamps.append(ts.isoformat() if hasattr(ts, 'isoformat') else str(ts))
        elif sig == 0 and position != 0:
            # Close position
            exit_price = price * (1 - fee_rate * position)
            raw_return = (exit_price - entry_price) / entry_price * position
            pnl_pct = raw_return * leverage
            pnl = capital * pnl_pct
            capital = max(capital + pnl, 0.01)

            if hasattr(entry_time, 'to_pydatetime'):
                entry_dt = entry_time.to_pydatetime()
            else:
                entry_dt = pd.Timestamp(entry_time).to_pydatetime()
            if hasattr(ts, 'to_pydatetime'):
                exit_dt = ts.to_pydatetime()
            else:
                exit_dt = pd.Timestamp(ts).to_pydatetime()

            duration_hours = (exit_dt - entry_dt).total_seconds() / 3600

            trades.append({
                "entry_time": str(entry_time),
                "exit_time": str(ts),
                "side": "long" if position == 1 else "short",
                "entry_price": round(entry_price, 4),
                "exit_price": round(exit_price, 4),
                "pnl": round(pnl, 2),
                "pnl_pct": round(pnl_pct * 100, 3),
                "duration_hours": round(duration_hours, 2),
            })

            equity_curve.append(capital)
            equity_timestamps.append(ts.isoformat() if hasattr(ts, 'isoformat') else str(ts))
            position = 0
            entry_price = 0.0
            entry_time = None
        else:
            equity_curve.append(capital)
            equity_timestamps.append(ts.isoformat() if hasattr(ts, 'isoformat') else str(ts))

    metrics = calculate_metrics(trades, equity_curve, initial_capital)

    # Build equity curve with timestamps
    equity_series = [
        {"time": t, "value": round(v, 2)}
        for t, v in zip(equity_timestamps, equity_curve)
    ]

    # Sample price data for chart overlay (max 500 points)
    price_sample_step = max(1, len(df) // 500)
    price_data = [
        {
            "time": (df.index[i].isoformat() if hasattr(df.index[i], 'isoformat') else str(df.index[i])),
            "open": round(float(df["open"].iloc[i]), 4),
            "high": round(float(df["high"].iloc[i]), 4),
            "low": round(float(df["low"].iloc[i]), 4),
            "close": round(float(df["close"].iloc[i]), 4),
            "volume": round(float(df["volume"].iloc[i]), 2),
        }
        for i in range(0, len(df), price_sample_step)
    ]

    return {
        "metrics": metrics,
        "equity_curve": equity_series,
        "trades": trades,
        "price_data": price_data,
    }
