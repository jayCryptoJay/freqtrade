from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, asc
from pydantic import BaseModel
from typing import Optional
import json

from ..models.database import get_db, Strategy, Backtest
from ..engine.templates import TEMPLATES

router = APIRouter(prefix="/api/strategies", tags=["strategies"])


class StrategyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    code: str
    tags: Optional[str] = None


class StrategyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    code: Optional[str] = None
    tags: Optional[str] = None
    is_favorite: Optional[bool] = None


def _strategy_to_dict(s: Strategy, best_backtest: Optional[Backtest] = None) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "description": s.description,
        "code": s.code,
        "tags": s.tags_list(),
        "is_favorite": s.is_favorite,
        "created_at": s.created_at.isoformat(),
        "updated_at": s.updated_at.isoformat(),
        "best_backtest": {
            "total_return": best_backtest.total_return,
            "max_drawdown": best_backtest.max_drawdown,
            "sharpe_ratio": best_backtest.sharpe_ratio,
            "win_rate": best_backtest.win_rate,
            "profit_factor": best_backtest.profit_factor,
            "total_trades": best_backtest.total_trades,
            "timeframe": best_backtest.timeframe,
            "equity_curve": best_backtest.equity_curve_data()[:100],  # snapshot
        } if best_backtest else None,
    }


@router.get("/templates")
async def get_templates():
    return [
        {
            "key": key,
            "name": tmpl["name"],
            "description": tmpl["description"],
            "code": tmpl["code"],
            "tags": tmpl["tags"],
        }
        for key, tmpl in TEMPLATES.items()
    ]


@router.get("")
async def list_strategies(
    sort_by: str = Query(default="created_at", pattern="^(created_at|sharpe_ratio|win_rate|total_return|profit_factor)$"),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    favorites_only: bool = False,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Strategy)

    if favorites_only:
        query = query.where(Strategy.is_favorite == True)

    if tag:
        query = query.where(Strategy.tags.contains(tag))

    if search:
        query = query.where(
            Strategy.name.contains(search) | Strategy.description.contains(search)
        )

    result = await db.execute(query.order_by(desc(Strategy.created_at)))
    strategies = result.scalars().all()

    # Fetch best backtests for each strategy
    response = []
    for s in strategies:
        best_bt = None
        if s.id:
            bt_result = await db.execute(
                select(Backtest)
                .where(Backtest.strategy_id == s.id)
                .order_by(desc(Backtest.sharpe_ratio))
                .limit(1)
            )
            best_bt = bt_result.scalar_one_or_none()
        response.append(_strategy_to_dict(s, best_bt))

    # Sort by metric if needed (in Python since it joins)
    sort_map = {
        "sharpe_ratio": lambda x: (x["best_backtest"] or {}).get("sharpe_ratio") or 0,
        "win_rate": lambda x: (x["best_backtest"] or {}).get("win_rate") or 0,
        "total_return": lambda x: (x["best_backtest"] or {}).get("total_return") or 0,
        "profit_factor": lambda x: (x["best_backtest"] or {}).get("profit_factor") or 0,
    }
    if sort_by in sort_map:
        response.sort(key=sort_map[sort_by], reverse=(order == "desc"))

    return response


@router.post("", status_code=201)
async def create_strategy(data: StrategyCreate, db: AsyncSession = Depends(get_db)):
    strategy = Strategy(
        name=data.name,
        description=data.description,
        code=data.code,
        tags=data.tags,
    )
    db.add(strategy)
    await db.commit()
    await db.refresh(strategy)
    return _strategy_to_dict(strategy)


@router.get("/{strategy_id}")
async def get_strategy(strategy_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Strategy).where(Strategy.id == strategy_id))
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    bt_result = await db.execute(
        select(Backtest)
        .where(Backtest.strategy_id == strategy_id)
        .order_by(desc(Backtest.sharpe_ratio))
        .limit(1)
    )
    best_bt = bt_result.scalar_one_or_none()
    return _strategy_to_dict(strategy, best_bt)


@router.patch("/{strategy_id}")
async def update_strategy(strategy_id: int, data: StrategyUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Strategy).where(Strategy.id == strategy_id))
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    if data.name is not None:
        strategy.name = data.name
    if data.description is not None:
        strategy.description = data.description
    if data.code is not None:
        strategy.code = data.code
    if data.tags is not None:
        strategy.tags = data.tags
    if data.is_favorite is not None:
        strategy.is_favorite = data.is_favorite

    await db.commit()
    await db.refresh(strategy)
    return _strategy_to_dict(strategy)


@router.delete("/{strategy_id}", status_code=204)
async def delete_strategy(strategy_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Strategy).where(Strategy.id == strategy_id))
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    await db.delete(strategy)
    await db.commit()


@router.post("/{strategy_id}/favorite")
async def toggle_favorite(strategy_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Strategy).where(Strategy.id == strategy_id))
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    strategy.is_favorite = not strategy.is_favorite
    await db.commit()
    return {"is_favorite": strategy.is_favorite}
