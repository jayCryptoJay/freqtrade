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

## Concepts

- Technical indicators: EMA(20/50/200), RSI(14), ATR(14), OBV
- Wyckoff heuristics: range detection, accumulation/distribution zones via range position and volume regime
- SMC heuristics: swing structure, break of structure (BOS), simple order block zones

These are intentionally heuristic and interpretable. You can swap in learned models later.

## Important

- This project does not place orders. It only computes signals. Connecting to execution and risk systems is up to you.
- Use at your own risk. Markets are risky; past performance ≠ future results.