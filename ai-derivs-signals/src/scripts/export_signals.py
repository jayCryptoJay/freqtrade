from __future__ import annotations
import argparse
import json
from datetime import datetime
from rich import print

from src.config.settings import load_settings
from src.data.ccxt_client import create_exchange
from src.data.loader import fetch_ohlcv_dataframe
from src.signals.generator import generate_latest_signal
from src.features.indicators import build_feature_frame


def main() -> None:
    parser = argparse.ArgumentParser(description="Export signals to JSONL over the last N candles")
    parser.add_argument("--symbol", type=str, default=None)
    parser.add_argument("--timeframe", type=str, default=None)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--out", type=str, default="signals.jsonl")
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

    with open(args.out, "w") as f:
        for i in range(200, len(df)):
            window = df.iloc[: i + 1]
            sig = generate_latest_signal(symbol, window, htf_row=htf_row, target_rr=settings.target_rr, require_htf=settings.mtf_confirm)
            rec = {
                "timestamp": str(sig.timestamp),
                "symbol": sig.symbol,
                "direction": sig.direction,
                "confidence": round(sig.confidence, 3),
                "entry": sig.entry,
                "stop": sig.stop,
                "take_profit": sig.take_profit,
                "context": sig.context,
            }
            f.write(json.dumps(rec) + "\n")

    print(f"Wrote {len(df) - 200} signals to {args.out}")


if __name__ == "__main__":
    main()