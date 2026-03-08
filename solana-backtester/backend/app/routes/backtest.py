import asyncio
import uuid
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel, Field

from ..models.database import get_db, Backtest
from ..services.data_fetcher import fetch_ohlcv_dataframe
from ..engine.backtester import run_backtest

router = APIRouter(prefix="/api/backtest", tags=["backtest"])

# In-memory task store — keyed by task_id
# Structure: {task_id: {status, progress, result, error, created_at}}
_tasks: dict[str, dict] = {}

SUPPORTED_SYMBOLS = ["SOLUSDT", "BTCUSDT", "ETHUSDT", "AVAXUSDT", "MATICUSDT"]


class BacktestRequest(BaseModel):
    strategy_code: str
    timeframe: str = Field(default="1h", pattern="^(15m|1h|4h)$")
    symbol: str = Field(default="SOLUSDT")
    leverage: float = Field(default=1.0, ge=1.0, le=25.0)
    fee_rate: float = Field(default=0.001, ge=0.0, le=0.01)
    initial_capital: float = Field(default=10000.0, ge=100.0)
    days_back: int = Field(default=180, ge=7, le=730)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    stop_loss_pct: Optional[float] = Field(default=None, ge=0.001, le=1.0)
    take_profit_pct: Optional[float] = Field(default=None, ge=0.001, le=10.0)
    strategy_id: Optional[int] = None
    save_result: bool = False


def _build_backtest_row(request: BacktestRequest, result: dict) -> dict:
    """Build keyword args for Backtest ORM row."""
    m = result["metrics"]
    return {
        "strategy_id": request.strategy_id,
        "timeframe": request.timeframe,
        "symbol": request.symbol,
        "leverage": request.leverage,
        "fee_rate": request.fee_rate,
        "stop_loss_pct": request.stop_loss_pct,
        "take_profit_pct": request.take_profit_pct,
        "total_return": m.get("total_return"),
        "max_drawdown": m.get("max_drawdown"),
        "sharpe_ratio": m.get("sharpe_ratio"),
        "sortino_ratio": m.get("sortino_ratio"),
        "calmar_ratio": m.get("calmar_ratio"),
        "win_rate": m.get("win_rate"),
        "profit_factor": m.get("profit_factor"),
        "total_trades": m.get("total_trades"),
        "avg_trade_duration": m.get("avg_trade_duration"),
        "max_consecutive_losses": m.get("max_consecutive_losses"),
        "max_consecutive_wins": m.get("max_consecutive_wins"),
        "annualized_return": m.get("annualized_return"),
        "bah_return": m.get("bah_return"),
        "equity_curve": json.dumps(result["equity_curve"]),
        "trades": json.dumps(result["trades"][:500]),
        "price_data": json.dumps(result["price_data"][:300]),
    }


async def _execute_task(task_id: str, request: BacktestRequest, db_session_factory):
    """Background coroutine: fetch data → run backtest → update task store."""
    task = _tasks[task_id]
    try:
        task["status"] = "fetching"
        task["progress"] = 0.05

        symbol = request.symbol if request.symbol in SUPPORTED_SYMBOLS else "SOLUSDT"

        df = await fetch_ohlcv_dataframe(
            timeframe=request.timeframe,
            days_back=request.days_back,
            start_date=request.start_date,
            end_date=request.end_date,
            symbol=symbol,
        )

        task["status"] = "running"
        task["progress"] = 0.15

        def _progress(p: float):
            task["progress"] = 0.15 + p * 0.80

        # Run CPU-bound work off the event loop
        result = await asyncio.to_thread(
            run_backtest,
            df,
            request.strategy_code,
            request.leverage,
            request.fee_rate,
            request.initial_capital,
            request.stop_loss_pct,
            request.take_profit_pct,
            request.timeframe,
            _progress,
        )

        task["status"] = "saving"
        task["progress"] = 0.97

        if request.save_result or request.strategy_id:
            async with db_session_factory() as db:
                row = Backtest(**_build_backtest_row(request, result))
                db.add(row)
                await db.commit()
                await db.refresh(row)
                result["backtest_id"] = row.id

        task["status"] = "done"
        task["progress"] = 1.0
        task["result"] = result

    except ValueError as e:
        task["status"] = "error"
        task["error"] = str(e)
    except Exception as e:
        task["status"] = "error"
        task["error"] = f"Backtest failed: {str(e)}"


@router.post("/start")
async def start_backtest(request: BacktestRequest):
    """
    Start a backtest as a background task.
    Returns {task_id} immediately. Poll /progress/{task_id} for status.
    """
    from ..models.database import AsyncSessionLocal

    if request.symbol not in SUPPORTED_SYMBOLS:
        raise HTTPException(status_code=400, detail=f"Unsupported symbol. Choose from: {SUPPORTED_SYMBOLS}")

    task_id = str(uuid.uuid4())
    _tasks[task_id] = {
        "status": "pending",
        "progress": 0.0,
        "result": None,
        "error": None,
        "created_at": datetime.utcnow().isoformat(),
    }

    # Fire and forget — runs concurrently
    asyncio.create_task(_execute_task(task_id, request, AsyncSessionLocal))

    return {"task_id": task_id}


@router.get("/progress/{task_id}")
async def get_progress(task_id: str):
    """Poll task status and progress (0–1)."""
    task = _tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    resp = {
        "task_id": task_id,
        "status": task["status"],
        "progress": task["progress"],
    }
    if task["status"] == "done":
        resp["result"] = task["result"]
        # Clean up after delivery
        del _tasks[task_id]
    elif task["status"] == "error":
        resp["error"] = task["error"]
        del _tasks[task_id]

    return resp


@router.get("/history/{strategy_id}")
async def get_backtest_history(strategy_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Backtest)
        .where(Backtest.strategy_id == strategy_id)
        .order_by(desc(Backtest.created_at))
        .limit(20)
    )
    return [
        {
            "id": b.id,
            "timeframe": b.timeframe,
            "symbol": b.symbol,
            "leverage": b.leverage,
            "metrics": b.metrics_dict(),
            "created_at": b.created_at.isoformat(),
        }
        for b in result.scalars().all()
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
        "symbol": backtest.symbol,
        "leverage": backtest.leverage,
        "metrics": backtest.metrics_dict(),
        "equity_curve": backtest.equity_curve_data(),
        "trades": backtest.trades_data(),
        "price_data": backtest.price_data_list(),
        "created_at": backtest.created_at.isoformat(),
    }


@router.get("/symbols")
async def get_supported_symbols():
    return SUPPORTED_SYMBOLS
