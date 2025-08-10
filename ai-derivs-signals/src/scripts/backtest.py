from __future__ import annotations
import argparse
from dataclasses import dataclass
from typing import Optional
import numpy as np
import pandas as pd
from rich import print

from src.config.settings import load_settings
from src.data.ccxt_client import create_exchange
from src.data.loader import fetch_ohlcv_dataframe
from src.signals.generator import generate_latest_signal
from src.features.indicators import build_feature_frame


@dataclass
class Position:
    side: Optional[str] = None  # "long" or "short"
    entry: float = 0.0
    stop: float = 0.0
    tp: float = 0.0


def backtest(df: pd.DataFrame, symbol: str, htf_row: pd.Series | None, target_rr: float, require_htf: bool) -> dict:
    balance = 10000.0
    risk_per_trade = 0.01
    fee = 0.0004  # taker fee approx

    position = Position()
    equity_curve = []
    trades = 0

    for i in range(200, len(df)):
        window = df.iloc[: i + 1]
        sig = generate_latest_signal(symbol, window, htf_row=htf_row, target_rr=target_rr, require_htf=require_htf)
        price = float(window["close"].iloc[-1])

        # Exit rules
        if position.side is not None:
            if position.side == "long":
                if price <= position.stop or price >= position.tp:
                    pnl = (price - position.entry) / position.entry
                    balance *= 1 + pnl - fee
                    position = Position()
            elif position.side == "short":
                if price >= position.stop or price <= position.tp:
                    pnl = (position.entry - price) / position.entry
                    balance *= 1 + pnl - fee
                    position = Position()

        # Entry rules: switch only if flat and strong signal
        if position.side is None and sig.direction is not None and sig.confidence >= 0.6 and sig.stop and sig.take_profit:
            stop_distance = abs(sig.entry - sig.stop)
            if stop_distance > 0 and stop_distance / sig.entry < 0.05:  # avoid absurd stops
                position = Position(side=sig.direction, entry=sig.entry, stop=sig.take_profit if sig.direction == "short" else sig.stop, tp=sig.stop if sig.direction == "short" else sig.take_profit)
                trades += 1

        equity_curve.append(balance)

    returns = pd.Series(equity_curve).pct_change().dropna()
    sharpe = np.sqrt(252) * returns.mean() / (returns.std() + 1e-9)

    return {
        "final_balance": balance,
        "return_pct": (balance / 10000.0 - 1.0) * 100,
        "sharpe": sharpe,
        "trades": trades,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Backtest the AI signal generator")
    parser.add_argument("--symbol", type=str, default=None)
    parser.add_argument("--timeframe", type=str, default=None)
    parser.add_argument("--limit", type=int, default=1200)
    args = parser.parse_args()

    settings = load_settings()
    symbol = args.symbol or settings.symbol
    timeframe = args.timeframe or settings.timeframe
    limit = args.limit

    ex = create_exchange(settings.exchange_id, settings.api_key, settings.api_secret, settings.exchange_sandbox)
    df = fetch_ohlcv_dataframe(ex, symbol, timeframe, limit=limit)

    htf_row = None
    if settings.mtf_confirm and settings.htf_timeframe:
        htf_df = fetch_ohlcv_dataframe(ex, symbol, settings.htf_timeframe, limit=min(500, limit))
        htf_feats = build_feature_frame(htf_df)
        htf_row = htf_feats.iloc[-1]

    res = backtest(df, symbol, htf_row=htf_row, target_rr=settings.target_rr, require_htf=settings.mtf_confirm)
    print(res)


if __name__ == "__main__":
    main()