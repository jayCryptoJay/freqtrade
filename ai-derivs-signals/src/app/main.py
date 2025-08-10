from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Optional

from src.config.settings import load_settings
from src.data.ccxt_client import create_exchange
from src.data.loader import fetch_ohlcv_dataframe
from src.signals.generator import generate_latest_signal
from src.features.indicators import build_feature_frame

app = FastAPI(title="AI Derivatives Signals API")

# Allow simple cross-origin access (customize in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve a minimal static UI
app.mount("/", StaticFiles(directory="src/app/static", html=True), name="static")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/signal")
def get_signal(symbol: Optional[str] = None, timeframe: Optional[str] = None, limit: int = 500) -> dict:
    settings = load_settings()
    symbol = symbol or settings.symbol
    timeframe = timeframe or settings.timeframe

    ex = create_exchange(settings.exchange_id, settings.api_key, settings.api_secret, settings.exchange_sandbox)
    df = fetch_ohlcv_dataframe(ex, symbol, timeframe, limit=limit)

    htf_row = None
    if settings.mtf_confirm and settings.htf_timeframe:
        htf_df = fetch_ohlcv_dataframe(ex, symbol, settings.htf_timeframe, limit=min(500, limit))
        htf_feats = build_feature_frame(htf_df)
        htf_row = htf_feats.iloc[-1]

    sig = generate_latest_signal(symbol, df, htf_row=htf_row, target_rr=settings.target_rr, require_htf=settings.mtf_confirm)
    return {
        "timestamp": str(sig.timestamp),
        "symbol": sig.symbol,
        "direction": sig.direction,
        "confidence": round(sig.confidence, 3),
        "entry": sig.entry,
        "stop": sig.stop,
        "take_profit": sig.take_profit,
        "context": sig.context,
    }


@app.get("/backtest")
def get_backtest(symbol: Optional[str] = None, timeframe: Optional[str] = None, limit: int = 1000) -> dict:
    settings = load_settings()
    symbol = symbol or settings.symbol
    timeframe = timeframe or settings.timeframe

    ex = create_exchange(settings.exchange_id, settings.api_key, settings.api_secret, settings.exchange_sandbox)
    df = fetch_ohlcv_dataframe(ex, symbol, timeframe, limit=limit)

    htf_row = None
    if settings.mtf_confirm and settings.htf_timeframe:
        htf_df = fetch_ohlcv_dataframe(ex, symbol, settings.htf_timeframe, limit=min(500, limit))
        htf_feats = build_feature_frame(htf_df)
        htf_row = htf_feats.iloc[-1]

    from src.scripts.backtest import backtest

    res = backtest(df, symbol, htf_row=htf_row, target_rr=settings.target_rr, require_htf=settings.mtf_confirm)
    return res