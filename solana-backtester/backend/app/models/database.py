from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Float, Integer, Boolean, Text, DateTime, JSON, ForeignKey
from datetime import datetime
from typing import Optional
import json

DATABASE_URL = "sqlite+aiosqlite:///./backtester.db"

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
    tags: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # comma-separated
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    backtests: Mapped[list["Backtest"]] = relationship("Backtest", back_populates="strategy", cascade="all, delete-orphan")

    def tags_list(self) -> list[str]:
        if not self.tags:
            return []
        return [t.strip() for t in self.tags.split(",") if t.strip()]


class Backtest(Base):
    __tablename__ = "backtests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    strategy_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("strategies.id"), nullable=True)
    timeframe: Mapped[str] = mapped_column(String(10), nullable=False)
    leverage: Mapped[float] = mapped_column(Float, default=1.0)
    fee_rate: Mapped[float] = mapped_column(Float, default=0.001)
    start_date: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    end_date: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    # Metrics
    total_return: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_drawdown: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sharpe_ratio: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    win_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    profit_factor: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_trades: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    avg_trade_duration: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Serialized JSON data
    equity_curve: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON
    trades: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON
    price_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON (sampled)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    strategy: Mapped[Optional["Strategy"]] = relationship("Strategy", back_populates="backtests")

    def equity_curve_data(self):
        return json.loads(self.equity_curve) if self.equity_curve else []

    def trades_data(self):
        return json.loads(self.trades) if self.trades else []

    def price_data_list(self):
        return json.loads(self.price_data) if self.price_data else []


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
