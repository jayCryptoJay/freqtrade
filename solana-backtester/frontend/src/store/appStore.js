import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_STRATEGY_CODE = `import pandas as pd
import numpy as np

def strategy(df: pd.DataFrame) -> pd.Series:
    """
    EMA Crossover - Starter Strategy
    Buy when 9-EMA crosses above 21-EMA, sell when it crosses below.
    """
    fast_ema = df['close'].ewm(span=9, adjust=False).mean()
    slow_ema = df['close'].ewm(span=21, adjust=False).mean()

    signals = pd.Series(0, index=df.index)
    long_cross = (fast_ema > slow_ema) & (fast_ema.shift(1) <= slow_ema.shift(1))
    short_cross = (fast_ema < slow_ema) & (fast_ema.shift(1) >= slow_ema.shift(1))

    signals[long_cross] = 1
    signals[short_cross] = -1
    return signals
`

export const useAppStore = create(
  persist(
    (set, get) => ({
      // Active backtest config
      timeframe: '1h',
      leverage: 1,
      feeRate: 0.001,
      initialCapital: 10000,
      daysBack: 180,
      strategyCode: DEFAULT_STRATEGY_CODE,

      // Results
      currentResults: null,
      isBacktesting: false,
      backtestError: null,

      // AI
      aiPrompt: '',
      isGenerating: false,
      isTweaking: false,
      generatedCode: null,
      tweakedCode: null,
      aiWarning: null,

      // Navigation
      activeTab: 'backtest',

      // Settings
      settings: {
        defaultLeverage: 1,
        defaultFeeRate: 0.001,
        defaultCapital: 10000,
        showTradeMarkers: true,
        theme: 'dark',
      },

      // Actions
      setTimeframe: (tf) => set({ timeframe: tf }),
      setLeverage: (v) => set({ leverage: v }),
      setFeeRate: (v) => set({ feeRate: v }),
      setInitialCapital: (v) => set({ initialCapital: v }),
      setDaysBack: (v) => set({ daysBack: v }),
      setStrategyCode: (code) => set({ strategyCode: code }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setCurrentResults: (results) => set({ currentResults: results }),
      setIsBacktesting: (v) => set({ isBacktesting: v }),
      setBacktestError: (e) => set({ backtestError: e }),
      setAiPrompt: (p) => set({ aiPrompt: p }),
      setIsGenerating: (v) => set({ isGenerating: v }),
      setIsTweaking: (v) => set({ isTweaking: v }),
      setGeneratedCode: (code) => set({ generatedCode: code }),
      setTweakedCode: (code) => set({ tweakedCode: code }),
      setAiWarning: (w) => set({ aiWarning: w }),
      updateSettings: (s) => set((state) => ({ settings: { ...state.settings, ...s } })),

      applyGeneratedCode: () => {
        const { generatedCode } = get()
        if (generatedCode) {
          set({ strategyCode: generatedCode, generatedCode: null, activeTab: 'backtest' })
        }
      },

      applyTweakedCode: () => {
        const { tweakedCode } = get()
        if (tweakedCode) {
          set({ strategyCode: tweakedCode, tweakedCode: null })
        }
      },

      resetResults: () => set({ currentResults: null, backtestError: null }),
    }),
    {
      name: 'sol-backtester',
      partialize: (state) => ({
        timeframe: state.timeframe,
        leverage: state.leverage,
        feeRate: state.feeRate,
        initialCapital: state.initialCapital,
        daysBack: state.daysBack,
        strategyCode: state.strategyCode,
        settings: state.settings,
      }),
    }
  )
)
