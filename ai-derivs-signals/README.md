# AI Derivatives Signals

AI-assisted signal generator for high-leverage crypto derivatives, combining classic technical analysis with Wyckoff and Smart Money Concepts (SMC) heuristics.

## Quickstart

1. Create a virtual environment and install deps:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

2. Configure environment (optional):

- Copy `.env.example` to `.env` and fill in values if you plan to use authenticated endpoints or sandbox trading.

3. Run a quick signal on BTC/USDT 1h:

```bash
python -m src.scripts.run_signals --symbol BTC/USDT --timeframe 1h --limit 500
```

4. Run a simple backtest:

```bash
python -m src.scripts.backtest --symbol BTC/USDT --timeframe 1h --limit 1000
```

## Run on iPhone (via API)

The easiest way to use this on your iPhone is to run the API on a server or your laptop and call it from your phone.

- Start the API server locally (venv):

```bash
uvicorn src.app.main:app --host 0.0.0.0 --port 8000 --reload
```

- Or run via Docker:

```bash
docker build -t ai-derivs-signals .
docker run --init --rm -p 8000:8000 --env-file .env ai-derivs-signals
```

- On your iPhone, use Safari or Shortcuts app to hit endpoints:
  - Health: `http://YOUR_IP:8000/health`
  - Latest signal: `http://YOUR_IP:8000/signal?symbol=BTC/USDT&timeframe=1h&limit=500`
  - Backtest: `http://YOUR_IP:8000/backtest?symbol=BTC/USDT&timeframe=1h&limit=1000`
  - Minimal UI: open `http://YOUR_IP:8000/` in Safari

Tips:
- Find your machine’s IP (e.g., `ipconfig` on Windows, `ifconfig` on macOS/Linux); ensure your phone and machine are on the same network.
- For remote access, deploy the Docker image to a VPS (e.g., fly.io, render.com, railway.app) and expose port 8000.

## Concepts

- Technical indicators: EMA(20/50/200), RSI(14), ATR(14), OBV
- Wyckoff heuristics: range detection, accumulation/distribution zones via range position and volume regime
- SMC heuristics: swing structure, break of structure (BOS), simple order block zones
- Liquidity sweeps: detect wicks that run prior highs/lows and close back inside
- Multi-timeframe confirmation: LTF entries filtered by HTF bias

These are intentionally heuristic and interpretable. You can swap in learned models later.

## Important

- This project does not place orders. It only computes signals. Connecting to execution and risk systems is up to you.
- Use at your own risk. Markets are risky; past performance ≠ future results.