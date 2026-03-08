import os
from typing import Optional
import anthropic

SYSTEM_PROMPT = """You are an expert algorithmic trading strategy developer specializing in cryptocurrency markets, particularly Solana (SOL/USDT).

Your task is to generate Python trading strategy code based on the user's description.

RULES:
1. The function MUST be named `strategy(df: pd.DataFrame) -> pd.Series`
2. The function receives a DataFrame with columns: open, high, low, close, volume (indexed by timestamp)
3. The function MUST return a pandas Series with the same index as df, containing:
   - 1 for LONG signals
   - -1 for SHORT signals
   - 0 for FLAT/exit signals
4. Only import: pandas (as pd), numpy (as np), math, statistics
5. No external API calls, no file I/O, no side effects
6. Include clear comments explaining the logic
7. Handle edge cases (NaN values, insufficient data)

Return ONLY the Python code, no markdown, no explanation outside the code comments."""

TWEAK_SYSTEM_PROMPT = """You are an expert algorithmic trading strategy developer. You will be given a trading strategy's Python code and its backtest performance metrics. Your job is to suggest and implement improvements.

RULES:
1. Return ONLY the improved Python function code
2. Maintain the same function signature: `strategy(df: pd.DataFrame) -> pd.Series`
3. The function must return a Series with values in {-1, 0, 1}
4. Only import: pandas (as pd), numpy (as np), math, statistics
5. Add comments explaining what you changed and why
6. Focus on the specific weaknesses mentioned in the metrics"""


def get_client() -> Optional[anthropic.Anthropic]:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key or api_key == "your_anthropic_api_key_here":
        return None
    return anthropic.Anthropic(api_key=api_key)


async def generate_strategy(prompt: str) -> dict:
    """Generate strategy code from natural language prompt."""
    client = get_client()

    if not client:
        # Return a demo strategy when no API key is configured
        return {
            "code": _demo_strategy(prompt),
            "warning": "ANTHROPIC_API_KEY not configured. Returning a demo strategy based on common patterns. Set your API key in backend/.env to enable AI generation.",
        }

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Generate a trading strategy for SOL/USDT based on this description:\n\n{prompt}",
            }
        ],
    )

    code = message.content[0].text.strip()
    # Strip markdown code blocks if present
    if code.startswith("```python"):
        code = code[9:]
    if code.startswith("```"):
        code = code[3:]
    if code.endswith("```"):
        code = code[:-3]

    return {"code": code.strip()}


async def tweak_strategy(code: str, metrics: dict, user_prompt: str = "") -> dict:
    """Improve an existing strategy based on its performance metrics."""
    client = get_client()

    metrics_summary = (
        f"Total Return: {metrics.get('total_return', 0):.2f}%\n"
        f"Max Drawdown: {metrics.get('max_drawdown', 0):.2f}%\n"
        f"Sharpe Ratio: {metrics.get('sharpe_ratio', 0):.3f}\n"
        f"Win Rate: {metrics.get('win_rate', 0):.2f}%\n"
        f"Profit Factor: {metrics.get('profit_factor', 0):.3f}\n"
        f"Total Trades: {metrics.get('total_trades', 0)}\n"
        f"Avg Trade Duration: {metrics.get('avg_trade_duration', 0):.2f}h"
    )

    if not client:
        return {
            "code": code,
            "suggestions": "ANTHROPIC_API_KEY not configured. Set your API key in backend/.env to enable AI-powered strategy improvement.",
            "warning": "AI tweaking unavailable - no API key configured.",
        }

    user_message = f"""Here is my current strategy code:

```python
{code}
```

Backtest Performance Metrics:
{metrics_summary}

{f"Additional improvement goals: {user_prompt}" if user_prompt else "Please improve this strategy to increase win rate and reduce drawdown."}

Return only the improved Python strategy function code."""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=TWEAK_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    improved_code = message.content[0].text.strip()
    if improved_code.startswith("```python"):
        improved_code = improved_code[9:]
    if improved_code.startswith("```"):
        improved_code = improved_code[3:]
    if improved_code.endswith("```"):
        improved_code = improved_code[:-3]

    return {
        "code": improved_code.strip(),
        "suggestions": f"Strategy improved based on metrics: {metrics_summary}",
    }


def _demo_strategy(prompt: str) -> str:
    """Return a sensible demo strategy when no API key is available."""
    return '''import pandas as pd
import numpy as np

def strategy(df: pd.DataFrame) -> pd.Series:
    """
    Adaptive RSI + EMA Strategy (AI-generated demo)
    Generated from prompt: ''' + prompt[:80] + '''...

    Logic:
    - Uses EMA trend filter (50-period) to determine market direction
    - Enters longs when RSI < 35 in uptrend
    - Enters shorts when RSI > 65 in downtrend
    - Exits when RSI crosses 50
    """
    # Parameters
    ema_period = 50
    rsi_period = 14
    rsi_oversold = 35
    rsi_overbought = 65

    # EMA trend filter
    ema = df['close'].ewm(span=ema_period, adjust=False).mean()
    trend_up = df['close'] > ema
    trend_down = df['close'] < ema

    # RSI calculation
    delta = df['close'].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1/rsi_period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/rsi_period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))

    signals = pd.Series(0, index=df.index)

    # Long: uptrend + oversold RSI
    signals[(trend_up) & (rsi < rsi_oversold)] = 1

    # Short: downtrend + overbought RSI
    signals[(trend_down) & (rsi > rsi_overbought)] = -1

    return signals
'''
