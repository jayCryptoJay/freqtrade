from pydantic import Field
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Exchange
    exchange_id: str = Field(default="binance", description="ccxt exchange id, e.g., binance, bybit, okx")
    exchange_sandbox: bool = Field(default=False, description="Use exchange sandbox if available")
    api_key: Optional[str] = Field(default=None)
    api_secret: Optional[str] = Field(default=None)

    # Trading
    symbol: str = Field(default="BTC/USDT")
    timeframe: str = Field(default="1h")
    htf_timeframe: Optional[str] = Field(default="4h", description="Higher timeframe for confirmation; set None to disable")
    mtf_confirm: bool = Field(default=True, description="Require higher timeframe confirmation")
    leverage: int = Field(default=10)
    risk_per_trade: float = Field(default=0.01, description="Fraction of balance at risk per trade")
    target_rr: float = Field(default=1.5, description="Target risk-reward multiple for TP")

    # Data
    data_limit: int = Field(default=750)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


def load_settings() -> Settings:
    return Settings()  # Loads from env if present