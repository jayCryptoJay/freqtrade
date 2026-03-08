import pandas as pd
import numpy as np
import traceback
from typing import Any, Callable, Optional

# Allowlist of actual objects — prevents string-based bypass
SAFE_BUILTINS = {
    "abs": abs, "all": all, "any": any, "bool": bool, "dict": dict,
    "enumerate": enumerate, "filter": filter, "float": float, "int": int,
    "isinstance": isinstance, "len": len, "list": list, "map": map,
    "max": max, "min": min, "print": print, "range": range, "round": round,
    "set": set, "sorted": sorted, "str": str, "sum": sum, "tuple": tuple,
    "type": type, "zip": zip, "None": None, "True": True, "False": False,
    "Exception": Exception, "ValueError": ValueError, "TypeError": TypeError,
}


def _safe_exec(code: str, df: pd.DataFrame) -> pd.Series:
    """Execute strategy code in a fully locked-down namespace."""
    import pandas as _pd
    import numpy as _np
    import math as _math
    import statistics as _statistics

    namespace = {
        "pd": _pd, "pandas": _pd,
        "np": _np, "numpy": _np,
        "math": _math,
        "statistics": _statistics,
        "__builtins__": SAFE_BUILTINS,   # dict of real objects, not strings
        "__name__": "<strategy>",
        "__import__": None,              # block dynamic imports
    }

    compiled = compile(code, "<strategy>", "exec")
    exec(compiled, namespace)

    if "strategy" not in namespace or not callable(namespace["strategy"]):
        raise ValueError("Strategy code must define a callable 'strategy(df)' function")

    result = namespace["strategy"](df.copy())
    return result


def _close_trade(
    position: int,
    entry_price: float,
    entry_time,
    exit_price: float,
    exit_time,
    capital: float,
    leverage: float,
) -> tuple[dict, float]:
    """Compute closed trade record and updated capital."""
    raw_return = (exit_price - entry_price) / entry_price * position
    pnl_pct = raw_return * leverage
    pnl = capital * pnl_pct
    new_capital = max(capital + pnl, 0.01)

    entry_dt = pd.Timestamp(entry_time).to_pydatetime()
    exit_dt = pd.Timestamp(exit_time).to_pydatetime()
    duration_hours = (exit_dt - entry_dt).total_seconds() / 3600

    trade = {
        "entry_time": str(entry_time),
        "exit_time": str(exit_time),
        "side": "long" if position == 1 else "short",
        "entry_price": round(float(entry_price), 4),
        "exit_price": round(float(exit_price), 4),
        "pnl": round(float(pnl), 2),
        "pnl_pct": round(float(pnl_pct * 100), 3),
        "duration_hours": round(float(duration_hours), 2),
    }
    return trade, new_capital


def run_backtest(
    df: pd.DataFrame,
    strategy_code: str,
    leverage: float = 1.0,
    fee_rate: float = 0.001,
    initial_capital: float = 10000.0,
    stop_loss_pct: Optional[float] = None,
    take_profit_pct: Optional[float] = None,
    timeframe: str = "1h",
    progress_callback: Optional[Callable[[float], None]] = None,
) -> dict[str, Any]:
    """
    Run the backtesting engine — every candle recorded for accurate metrics.

    Returns metrics, per-candle equity curve with buy&hold overlay,
    trade log, and sampled price data.
    """
    try:
        signals = _safe_exec(strategy_code, df)
    except Exception:
        raise ValueError(f"Strategy execution error:\n{traceback.format_exc()}")

    if not isinstance(signals, pd.Series):
        raise ValueError("strategy() must return a pandas Series")

    signals = signals.reindex(df.index).fillna(0).astype(int).clip(-1, 1)

    prices = df["close"].values
    timestamps = df.index
    n = len(df)

    capital = initial_capital
    position = 0
    entry_price = 0.0
    entry_time = None

    trades: list[dict] = []
    equity_curve: list[float] = []
    equity_timestamps: list[str] = []

    bah_initial_price = float(prices[0])

    def _ts(ts) -> str:
        return ts.isoformat() if hasattr(ts, "isoformat") else str(ts)

    for i in range(n):
        sig = int(signals.iloc[i])
        price = float(prices[i])
        ts = timestamps[i]

        # SL/TP enforcement on open position
        if position != 0 and i > 0:
            raw_ret = (price - entry_price) / entry_price * position
            current_pnl = raw_ret * leverage
            hit_sl = stop_loss_pct is not None and current_pnl <= -abs(stop_loss_pct)
            hit_tp = take_profit_pct is not None and current_pnl >= abs(take_profit_pct)
            if hit_sl or hit_tp:
                sig = 0  # force close

        # Close existing position when signal differs
        if position != 0 and sig != position:
            exit_price = price * (1 - fee_rate * position)
            trade, capital = _close_trade(
                position, entry_price, entry_time, exit_price, ts, capital, leverage
            )
            trades.append(trade)
            position = 0
            entry_price = 0.0
            entry_time = None

        # Open new position
        if position == 0 and sig in (1, -1):
            position = sig
            entry_price = price * (1 + fee_rate * sig)
            entry_time = ts

        # Mark-to-market equity (recorded every single candle)
        if position != 0:
            unrealized = (price - entry_price) / entry_price * position * leverage
            current_equity = capital * (1 + unrealized)
        else:
            current_equity = capital

        equity_curve.append(max(current_equity, 0.0))
        equity_timestamps.append(_ts(ts))

        if progress_callback and i % max(1, n // 20) == 0:
            progress_callback(i / n)

    # Close open position at end of data
    if position != 0:
        last_price = float(prices[-1]) * (1 - fee_rate * position)
        trade, capital = _close_trade(
            position, entry_price, entry_time, last_price, timestamps[-1], capital, leverage
        )
        trades.append(trade)
        equity_curve[-1] = capital

    if progress_callback:
        progress_callback(1.0)

    # Buy-and-hold benchmark equity at every candle
    bah_equity = [
        round(initial_capital * float(p) / bah_initial_price, 2)
        for p in prices
    ]

    from .metrics import calculate_metrics

    metrics = calculate_metrics(
        trades=trades,
        equity_curve=equity_curve,
        initial_capital=initial_capital,
        timeframe=timeframe,
        bah_equity=bah_equity,
    )

    # Sample equity curve for chart (max 1000 points)
    sample_step = max(1, n // 1000)
    equity_series = [
        {
            "time": equity_timestamps[i],
            "value": round(equity_curve[i], 2),
            "bah": bah_equity[i],
        }
        for i in range(0, n, sample_step)
    ]

    # Sample price data for chart (max 600 points)
    price_step = max(1, n // 600)
    price_data = [
        {
            "time": _ts(df.index[i]),
            "open": round(float(df["open"].iloc[i]), 4),
            "high": round(float(df["high"].iloc[i]), 4),
            "low": round(float(df["low"].iloc[i]), 4),
            "close": round(float(df["close"].iloc[i]), 4),
            "volume": round(float(df["volume"].iloc[i]), 2),
        }
        for i in range(0, n, price_step)
    ]

    return {
        "metrics": metrics,
        "equity_curve": equity_series,
        "trades": trades,
        "price_data": price_data,
    }
