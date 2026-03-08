from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional
import json

from ..models.database import get_db, Backtest, Strategy
from ..services.data_fetcher import fetch_ohlcv_dataframe
from ..engine.backtester import run_backtest

router = APIRouter(prefix="/api/backtest", tags=["backtest"])


class BacktestRequest(BaseModel):
    strategy_code: str
    timeframe: str = Field(default="1h", pattern="^(15m|1h|4h)$")
    leverage: float = Field(default=1.0, ge=1.0, le=25.0)
    fee_rate: float = Field(default=0.001, ge=0.0, le=0.01)
    initial_capital: float = Field(default=10000.0, ge=100.0)
    days_back: int = Field(default=180, ge=7, le=730)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    strategy_id: Optional[int] = None
    save_result: bool = False


class BacktestResponse(BaseModel):
    metrics: dict
    equity_curve: list
    trades: list
    price_data: list
    backtest_id: Optional[int] = None


@router.post("/run", response_model=BacktestResponse)
async def run_backtest_endpoint(
    request: BacktestRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        df = await fetch_ohlcv_dataframe(
            timeframe=request.timeframe,
            days_back=request.days_back,
            start_date=request.start_date,
            end_date=request.end_date,
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to fetch market data: {str(e)}")

    try:
        result = run_backtest(
            df=df,
            strategy_code=request.strategy_code,
            leverage=request.leverage,
            fee_rate=request.fee_rate,
            initial_capital=request.initial_capital,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest error: {str(e)}")

    backtest_id = None
    if request.save_result or request.strategy_id:
        backtest = Backtest(
            strategy_id=request.strategy_id,
            timeframe=request.timeframe,
            leverage=request.leverage,
            fee_rate=request.fee_rate,
            **result["metrics"],
            equity_curve=json.dumps(result["equity_curve"]),
            trades=json.dumps(result["trades"][:500]),  # limit stored trades
            price_data=json.dumps(result["price_data"][:200]),  # limit price data
        )
        db.add(backtest)
        await db.commit()
        await db.refresh(backtest)
        backtest_id = backtest.id

    return BacktestResponse(
        metrics=result["metrics"],
        equity_curve=result["equity_curve"],
        trades=result["trades"],
        price_data=result["price_data"],
        backtest_id=backtest_id,
    )


@router.get("/history/{strategy_id}")
async def get_backtest_history(strategy_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Backtest)
        .where(Backtest.strategy_id == strategy_id)
        .order_by(Backtest.created_at.desc())
        .limit(20)
    )
    backtests = result.scalars().all()
    return [
        {
            "id": b.id,
            "timeframe": b.timeframe,
            "leverage": b.leverage,
            "metrics": {
                "total_return": b.total_return,
                "max_drawdown": b.max_drawdown,
                "sharpe_ratio": b.sharpe_ratio,
                "win_rate": b.win_rate,
                "profit_factor": b.profit_factor,
                "total_trades": b.total_trades,
                "avg_trade_duration": b.avg_trade_duration,
            },
            "created_at": b.created_at.isoformat(),
        }
        for b in backtests
    ]


@router.get("/result/{backtest_id}")
async def get_backtest_result(backtest_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Backtest).where(Backtest.id == backtest_id))
    backtest = result.scalar_one_or_none()
    if not backtest:
        raise HTTPException(status_code=404, detail="Backtest not found")

    return {
        "id": backtest.id,
        "strategy_id": backtest.strategy_id,
        "timeframe": backtest.timeframe,
        "leverage": backtest.leverage,
        "metrics": {
            "total_return": backtest.total_return,
            "max_drawdown": backtest.max_drawdown,
            "sharpe_ratio": backtest.sharpe_ratio,
            "win_rate": backtest.win_rate,
            "profit_factor": backtest.profit_factor,
            "total_trades": backtest.total_trades,
            "avg_trade_duration": backtest.avg_trade_duration,
        },
        "equity_curve": backtest.equity_curve_data(),
        "trades": backtest.trades_data(),
        "price_data": backtest.price_data_list(),
        "created_at": backtest.created_at.isoformat(),
    }
