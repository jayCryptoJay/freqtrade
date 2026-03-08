import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from .models.database import init_db
from .routes import backtest, strategies, ai, data


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Solana Strategy Backtester",
    description="Mobile-first SOL/USDT strategy backtesting platform",
    version="1.0.0",
    lifespan=lifespan,
)

cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(backtest.router)
app.include_router(strategies.router)
app.include_router(ai.router)
app.include_router(data.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "sol-backtester"}
