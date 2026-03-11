# SOL/USDT Strategy Backtester

A mobile-first, full-stack Solana trading strategy backtesting platform.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Tailwind CSS + Recharts + CodeMirror |
| Backend | Python FastAPI + SQLAlchemy |
| Database | SQLite (aiosqlite) |
| AI | Anthropic Claude Sonnet 4.6 |
| Data | Binance Public API (Bybit fallback) |

## Features

- **Timeframe Selection** — 15m, 1h, 4h SOL/USDT OHLCV data from Binance
- **Strategy Editor** — CodeMirror Python editor with 3 built-in templates
- **Backtesting Engine** — Simulates long/short trades with leverage, fees, slippage
- **Performance Metrics** — Return %, drawdown, Sharpe ratio, win rate, profit factor
- **Equity Curve Chart** — Recharts area chart with trade markers
- **Trade Log Table** — Sortable, filterable individual trade log
- **AI Generation** — Describe a strategy in plain English → get Python code
- **AI Tweak** — Send results to Claude for targeted improvements
- **Strategy Library** — Save, tag, filter, and sort saved strategies
- **Favorites System** — Star your best strategies
- **Mobile-first UI** — Dark trading app aesthetic, thumb-friendly 48px tap targets

## Quick Start

```bash
cd solana-backtester
./start.sh
```

This installs all dependencies and starts:
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs

## Manual Start

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # Add your ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## AI Features

Set your Anthropic API key in `backend/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Without an API key, demo strategies are returned for testing.

## Strategy Format

Strategies must define a `strategy(df)` function:

```python
import pandas as pd
import numpy as np

def strategy(df: pd.DataFrame) -> pd.Series:
    """
    df columns: open, high, low, close, volume
    Return: Series of 1 (long), -1 (short), 0 (flat)
    """
    fast_ema = df['close'].ewm(span=9, adjust=False).mean()
    slow_ema = df['close'].ewm(span=21, adjust=False).mean()

    signals = pd.Series(0, index=df.index)
    signals[fast_ema > slow_ema] = 1
    signals[fast_ema < slow_ema] = -1
    return signals
```

## File Structure

```
solana-backtester/
├── backend/
│   ├── app/
│   │   ├── engine/
│   │   │   ├── backtester.py    # Core simulation engine
│   │   │   ├── metrics.py       # Performance metric calculations
│   │   │   └── templates.py     # 3 built-in strategy templates
│   │   ├── models/
│   │   │   └── database.py      # SQLAlchemy ORM models
│   │   ├── routes/
│   │   │   ├── backtest.py      # POST /api/backtest/run
│   │   │   ├── strategies.py    # CRUD /api/strategies
│   │   │   ├── ai.py            # POST /api/ai/generate, /tweak
│   │   │   └── data.py          # GET /api/data/ohlcv
│   │   ├── services/
│   │   │   ├── data_fetcher.py  # Binance/Bybit API client
│   │   │   └── ai_service.py    # Claude integration
│   │   └── main.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── components/
        │   ├── backtest/        # TimeframeSelector, StrategyEditor, Config
        │   ├── results/         # MetricsGrid, EquityChart, TradeLog
        │   ├── strategies/      # StrategyCard, SaveStrategyModal
        │   ├── ai/              # AIPromptInput, TweakWithAI
        │   ├── common/          # Modal, EmptyState, LoadingSpinner
        │   └── layout/          # Header, BottomNav
        ├── pages/               # BacktestPage, ResultsPage, StrategiesPage, SettingsPage
        ├── store/               # Zustand state management
        ├── services/            # Axios API client
        └── utils/               # Formatters
```

## Deployment

### Backend → Render.com (free tier)

1. Go to [render.com](https://render.com) and sign up / log in
2. Click **New → Blueprint** and connect this GitHub repo
3. Render will detect `solana-backtester/render.yaml` automatically — this creates:
   - A free PostgreSQL database
   - A Python web service pointing at `solana-backtester/backend`
4. After the service is created, go to its **Environment** tab and set:
   ```
   ANTHROPIC_API_KEY = sk-ant-your-key-here
   ```
5. Note your backend URL — it will look like `https://sol-backtester-api.onrender.com`

> **Note:** Render's free tier spins down after 15 min of inactivity (first request takes ~30s to wake up). Upgrade to a paid plan to avoid cold starts.

---

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) and import this GitHub repo
2. Set **Root Directory** to `solana-backtester/frontend`
3. Under **Environment Variables**, add:
   ```
   VITE_API_URL = https://sol-backtester-api.onrender.com/api
   ```
   (replace with your actual Render backend URL from the step above)
4. Click **Deploy**

---

### CORS — connect frontend ↔ backend

After you know your Vercel URL (e.g. `https://my-app.vercel.app`), update the `CORS_ORIGINS` env var on Render:

```
CORS_ORIGINS = https://my-app.vercel.app
```

Until then, leaving it as `*` works fine for personal use.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/backtest/run` | Run backtest with strategy code |
| GET | `/api/backtest/history/{id}` | Get backtest history for a strategy |
| GET | `/api/strategies` | List saved strategies |
| POST | `/api/strategies` | Save a new strategy |
| PATCH | `/api/strategies/{id}` | Update a strategy |
| DELETE | `/api/strategies/{id}` | Delete a strategy |
| POST | `/api/strategies/{id}/favorite` | Toggle favorite |
| GET | `/api/strategies/templates` | Get 3 built-in templates |
| POST | `/api/ai/generate` | Generate strategy from prompt |
| POST | `/api/ai/tweak` | Improve strategy with AI |
| GET | `/api/data/ohlcv` | Fetch SOL/USDT OHLCV data |
