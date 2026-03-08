import numpy as np
import pandas as pd
from typing import Any


def calculate_metrics(trades: list[dict], equity_curve: list[float], initial_capital: float = 10000.0) -> dict[str, Any]:
    if not trades or len(equity_curve) < 2:
        return {
            "total_return": 0.0,
            "max_drawdown": 0.0,
            "sharpe_ratio": 0.0,
            "win_rate": 0.0,
            "profit_factor": 0.0,
            "total_trades": 0,
            "avg_trade_duration": 0.0,
        }

    equity = np.array(equity_curve)
    final_equity = equity[-1]

    # Total return %
    total_return = (final_equity - initial_capital) / initial_capital * 100

    # Max drawdown %
    peak = np.maximum.accumulate(equity)
    drawdown = (equity - peak) / peak * 100
    max_drawdown = float(np.min(drawdown))

    # Sharpe ratio (annualized, assuming daily returns from trade PnL)
    returns = np.diff(equity) / equity[:-1]
    if len(returns) > 1 and np.std(returns) > 0:
        sharpe = np.mean(returns) / np.std(returns) * np.sqrt(252)
    else:
        sharpe = 0.0

    # Win rate
    profits = [t["pnl"] for t in trades if "pnl" in t]
    if profits:
        wins = sum(1 for p in profits if p > 0)
        win_rate = wins / len(profits) * 100
    else:
        win_rate = 0.0

    # Profit factor
    gross_profit = sum(p for p in profits if p > 0)
    gross_loss = abs(sum(p for p in profits if p < 0))
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else (float("inf") if gross_profit > 0 else 0.0)

    # Average trade duration (in hours)
    durations = [t.get("duration_hours", 0) for t in trades]
    avg_duration = float(np.mean(durations)) if durations else 0.0

    return {
        "total_return": round(float(total_return), 2),
        "max_drawdown": round(float(max_drawdown), 2),
        "sharpe_ratio": round(float(sharpe), 3),
        "win_rate": round(float(win_rate), 2),
        "profit_factor": round(float(min(profit_factor, 999.0)), 3),
        "total_trades": len(trades),
        "avg_trade_duration": round(avg_duration, 2),
    }
