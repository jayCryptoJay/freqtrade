from __future__ import annotations
import argparse
from rich import print

from src.config.settings import load_settings
from src.data.ccxt_client import create_exchange
from src.data.loader import fetch_ohlcv_dataframe
from src.signals.generator import generate_latest_signal
from src.features.indicators import build_feature_frame


def main() -> None:
    parser = argparse.ArgumentParser(description="Run latest AI signal on a symbol/timeframe")
    parser.add_argument("--symbol", type=str, default=None)
    parser.add_argument("--timeframe", type=str, default=None)
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    settings = load_settings()
    symbol = args.symbol or settings.symbol
    timeframe = args.timeframe or settings.timeframe
    limit = args.limit or settings.data_limit

    ex = create_exchange(settings.exchange_id, settings.api_key, settings.api_secret, settings.exchange_sandbox)
    df = fetch_ohlcv_dataframe(ex, symbol, timeframe, limit=limit)

    htf_row = None
    if settings.mtf_confirm and settings.htf_timeframe:
        htf_df = fetch_ohlcv_dataframe(ex, symbol, settings.htf_timeframe, limit=min(500, limit))
        htf_feats = build_feature_frame(htf_df)
        htf_row = htf_feats.iloc[-1]

    signal = generate_latest_signal(symbol, df, htf_row=htf_row, target_rr=settings.target_rr, require_htf=settings.mtf_confirm)
    print({
        "timestamp": str(signal.timestamp),
        "symbol": signal.symbol,
        "direction": signal.direction,
        "confidence": round(signal.confidence, 3),
        "entry": signal.entry,
        "stop": signal.stop,
        "take_profit": signal.take_profit,
        "context": signal.context,
    })


if __name__ == "__main__":
    main()