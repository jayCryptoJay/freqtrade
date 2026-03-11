from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Float, Integer, Boolean, Text, DateTime, ForeignKey
from datetime import datetime
from typing import Optional
import json
import os

_raw_url = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./backtester.db")
# Render provides postgresql:// URLs; SQLAlchemy async needs postgresql+asyncpg://
if _raw_url.startswith("postgres://"):
    _raw_url = _raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif _raw_url.startswith("postgresql://") and "+asyncpg" not in _raw_url:
    _raw_url = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

DATABASE_URL = _raw_url

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Strategy(Base):
    __tablename__ = "strategies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    backtests: Mapped[list["Backtest"]] = relationship("Backtest", back_populates="strategy", cascade="all, delete-orphan")
    versions: Mapped[list["StrategyVersion"]] = relationship("StrategyVersion", back_populates="strategy", cascade="all, delete-orphan")

    def tags_list(self) -> list[str]:
        if not self.tags:
            return []
        return [t.strip() for t in self.tags.split(",") if t.strip()]


class StrategyVersion(Base):
    """Snapshot of strategy code saved on every code update (max 10 per strategy)."""
    __tablename__ = "strategy_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    strategy_id: Mapped[int] = mapped_column(Integer, ForeignKey("strategies.id"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    label: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # optional message
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    strategy: Mapped["Strategy"] = relationship("Strategy", back_populates="versions")


class Backtest(Base):
    __tablename__ = "backtests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    strategy_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("strategies.id"), nullable=True)
    timeframe: Mapped[str] = mapped_column(String(10), nullable=False)
    symbol: Mapped[str] = mapped_column(String(20), default="SOLUSDT")
    leverage: Mapped[float] = mapped_column(Float, default=1.0)
    fee_rate: Mapped[float] = mapped_column(Float, default=0.001)
    stop_loss_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    take_profit_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    start_date: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    end_date: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    # Core metrics
    total_return: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_drawdown: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sharpe_ratio: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sortino_ratio: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    calmar_ratio: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    win_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    profit_factor: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_trades: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    avg_trade_duration: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_consecutive_losses: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_consecutive_wins: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    annualized_return: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    bah_return: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Serialized JSON
    equity_curve: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    trades: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    strategy: Mapped[Optional["Strategy"]] = relationship("Strategy", back_populates="backtests")

    def equity_curve_data(self):
        return json.loads(self.equity_curve) if self.equity_curve else []

    def trades_data(self):
        return json.loads(self.trades) if self.trades else []

    def price_data_list(self):
        return json.loads(self.price_data) if self.price_data else []

    def metrics_dict(self) -> dict:
        return {
            "total_return": self.total_return,
            "max_drawdown": self.max_drawdown,
            "sharpe_ratio": self.sharpe_ratio,
            "sortino_ratio": self.sortino_ratio,
            "calmar_ratio": self.calmar_ratio,
            "win_rate": self.win_rate,
            "profit_factor": self.profit_factor,
            "total_trades": self.total_trades,
            "avg_trade_duration": self.avg_trade_duration,
            "max_consecutive_losses": self.max_consecutive_losses,
            "max_consecutive_wins": self.max_consecutive_wins,
            "annualized_return": self.annualized_return,
            "bah_return": self.bah_return,
        }


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
