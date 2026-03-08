import numpy as np
import math
from typing import Any, Optional

# Candles per year for correct Sharpe/Sortino annualization
PERIODS_PER_YEAR = {
    "15m": 365 * 24 * 4,
    "1h":  365 * 24,
    "4h":  365 * 6,
}


def calculate_metrics(
    trades: list[dict],
    equity_curve: list[float],
    initial_capital: float = 10000.0,
    timeframe: str = "1h",
    bah_equity: Optional[list[float]] = None,
) -> dict[str, Any]:
    equity = np.array(equity_curve, dtype=float)
    n = len(equity)

    if n < 2 or not trades:
        return _empty_metrics(initial_capital, bah_equity)

    final_equity = float(equity[-1])
    total_return = (final_equity - initial_capital) / initial_capital * 100

    # Max drawdown using full per-candle equity (accurate since backtester records every candle)
    peak = np.maximum.accumulate(equity)
    dd = (equity - peak) / np.where(peak == 0, 1.0, peak) * 100
    max_drawdown = float(np.min(dd))

    # Per-candle returns — correct annualization factor per timeframe
    returns = np.diff(equity) / equity[:-1]
    returns = returns[np.isfinite(returns)]
    ann_factor = math.sqrt(PERIODS_PER_YEAR.get(timeframe, 365 * 24))

    if len(returns) > 1 and np.std(returns) > 0:
        sharpe = float(np.mean(returns) / np.std(returns) * ann_factor)
    else:
        sharpe = 0.0

    # Sortino: penalizes only downside deviation
    downside = returns[returns < 0]
    if len(downside) > 1 and np.std(downside) > 0:
        sortino = float(np.mean(returns) / np.std(downside) * ann_factor)
    else:
        sortino = 0.0

    # Calmar: annualized_return / abs(max_drawdown)
    holding_years = n / max(PERIODS_PER_YEAR.get(timeframe, 365 * 24), 1)
    annualized_return = ((final_equity / initial_capital) ** (1 / max(holding_years, 1e-9)) - 1) * 100
    calmar = annualized_return / abs(max_drawdown) if max_drawdown < 0 else 0.0

    # Trade-level stats
    profits = [t["pnl"] for t in trades]
    wins = [p for p in profits if p > 0]
    losses = [p for p in profits if p <= 0]

    win_rate = len(wins) / len(profits) * 100 if profits else 0.0
    gross_profit = sum(wins)
    gross_loss = abs(sum(losses))
    profit_factor = (
        gross_profit / gross_loss if gross_loss > 0
        else (float("inf") if gross_profit > 0 else 0.0)
    )

    avg_duration = float(np.mean([t.get("duration_hours", 0) for t in trades])) if trades else 0.0

    # Streak stats
    max_consec_losses = _max_streak(profits, losing=True)
    max_consec_wins = _max_streak(profits, losing=False)

    bah_return = None
    if bah_equity and len(bah_equity) >= 2:
        bah_return = round((bah_equity[-1] - initial_capital) / initial_capital * 100, 2)

    return {
        "total_return": round(total_return, 2),
        "max_drawdown": round(max_drawdown, 2),
        "sharpe_ratio": round(sharpe, 3),
        "sortino_ratio": round(sortino, 3),
        "calmar_ratio": round(min(calmar, 999.0), 3),
        "win_rate": round(win_rate, 2),
        "profit_factor": round(min(profit_factor, 999.0), 3),
        "total_trades": len(trades),
        "avg_trade_duration": round(avg_duration, 2),
        "max_consecutive_losses": max_consec_losses,
        "max_consecutive_wins": max_consec_wins,
        "annualized_return": round(annualized_return, 2),
        "bah_return": bah_return,
    }


def _max_streak(profits: list[float], losing: bool) -> int:
    best = cur = 0
    for p in profits:
        is_target = (p <= 0) if losing else (p > 0)
        cur = cur + 1 if is_target else 0
        best = max(best, cur)
    return best


def _empty_metrics(initial_capital: float, bah_equity) -> dict:
    bah_return = None
    if bah_equity and len(bah_equity) >= 2:
        bah_return = round((bah_equity[-1] - initial_capital) / initial_capital * 100, 2)
    return {
        "total_return": 0.0, "max_drawdown": 0.0, "sharpe_ratio": 0.0,
        "sortino_ratio": 0.0, "calmar_ratio": 0.0, "win_rate": 0.0,
        "profit_factor": 0.0, "total_trades": 0, "avg_trade_duration": 0.0,
        "max_consecutive_losses": 0, "max_consecutive_wins": 0,
        "annualized_return": 0.0, "bah_return": bah_return,
    }
