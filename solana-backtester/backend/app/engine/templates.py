EMA_CROSSOVER = '''import pandas as pd
import numpy as np

def strategy(df: pd.DataFrame) -> pd.Series:
    """
    EMA Crossover Strategy
    - Long when fast EMA crosses above slow EMA
    - Short when fast EMA crosses below slow EMA
    """
    fast_period = 9
    slow_period = 21

    fast_ema = df['close'].ewm(span=fast_period, adjust=False).mean()
    slow_ema = df['close'].ewm(span=slow_period, adjust=False).mean()

    signals = pd.Series(0, index=df.index)

    # Long signal: fast crosses above slow
    long_cross = (fast_ema > slow_ema) & (fast_ema.shift(1) <= slow_ema.shift(1))
    # Short signal: fast crosses below slow
    short_cross = (fast_ema < slow_ema) & (fast_ema.shift(1) >= slow_ema.shift(1))

    signals[long_cross] = 1
    signals[short_cross] = -1

    return signals
'''

RSI_MEAN_REVERSION = '''import pandas as pd
import numpy as np

def strategy(df: pd.DataFrame) -> pd.Series:
    """
    RSI Mean Reversion Strategy
    - Long when RSI drops below 30 (oversold)
    - Short when RSI rises above 70 (overbought)
    - Exit when RSI crosses 50
    """
    rsi_period = 14
    oversold = 30
    overbought = 70
    exit_level = 50

    # Calculate RSI
    delta = df['close'].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1/rsi_period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/rsi_period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))

    signals = pd.Series(0, index=df.index)

    signals[rsi < oversold] = 1   # Oversold -> Long
    signals[rsi > overbought] = -1  # Overbought -> Short

    return signals
'''

MACD_MOMENTUM = '''import pandas as pd
import numpy as np

def strategy(df: pd.DataFrame) -> pd.Series:
    """
    MACD Momentum Strategy
    - Long when MACD line crosses above signal line (bullish momentum)
    - Short when MACD line crosses below signal line (bearish momentum)
    - Confirm with histogram direction
    """
    fast = 12
    slow = 26
    signal_period = 9

    ema_fast = df['close'].ewm(span=fast, adjust=False).mean()
    ema_slow = df['close'].ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal_period, adjust=False).mean()
    histogram = macd_line - signal_line

    signals = pd.Series(0, index=df.index)

    # Bullish crossover: MACD crosses above signal
    bull_cross = (macd_line > signal_line) & (macd_line.shift(1) <= signal_line.shift(1))
    # Bearish crossover: MACD crosses below signal
    bear_cross = (macd_line < signal_line) & (macd_line.shift(1) >= signal_line.shift(1))

    signals[bull_cross] = 1
    signals[bear_cross] = -1

    return signals
'''

TEMPLATES = {
    "ema_crossover": {
        "name": "EMA Crossover",
        "description": "Buy when fast EMA (9) crosses above slow EMA (21), sell when it crosses below.",
        "code": EMA_CROSSOVER,
        "tags": ["trend", "ema", "crossover"],
    },
    "rsi_mean_reversion": {
        "name": "RSI Mean Reversion",
        "description": "Buy oversold conditions (RSI < 30), sell overbought (RSI > 70).",
        "code": RSI_MEAN_REVERSION,
        "tags": ["mean-reversion", "rsi", "oscillator"],
    },
    "macd_momentum": {
        "name": "MACD Momentum",
        "description": "Trade MACD crossovers to capture momentum shifts.",
        "code": MACD_MOMENTUM,
        "tags": ["momentum", "macd", "trend"],
    },
}
