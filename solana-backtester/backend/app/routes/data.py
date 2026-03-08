from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from ..services.data_fetcher import fetch_ohlcv_dataframe

router = APIRouter(prefix="/api/data", tags=["data"])


@router.get("/ohlcv")
async def get_ohlcv(
    timeframe: str = Query(default="1h", pattern="^(15m|1h|4h)$"),
    days_back: int = Query(default=30, ge=1, le=365),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(default=500, ge=10, le=2000),
):
    try:
        df = await fetch_ohlcv_dataframe(
            timeframe=timeframe,
            days_back=days_back,
            start_date=start_date,
            end_date=end_date,
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to fetch data: {str(e)}")

    # Sample for chart display
    step = max(1, len(df) // limit)
    sampled = df.iloc[::step]

    return {
        "timeframe": timeframe,
        "symbol": "SOL/USDT",
        "count": len(sampled),
        "candles": [
            {
                "time": idx.isoformat(),
                "open": round(float(row["open"]), 4),
                "high": round(float(row["high"]), 4),
                "low": round(float(row["low"]), 4),
                "close": round(float(row["close"]), 4),
                "volume": round(float(row["volume"]), 2),
            }
            for idx, row in sampled.iterrows()
        ],
    }
