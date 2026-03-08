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
      // Backtest config
      timeframe: '1h',
      symbol: 'SOLUSDT',
      leverage: 1,
      feeRate: 0.001,
      initialCapital: 10000,
      daysBack: 180,
      startDate: '',
      endDate: '',
      stopLossPct: '',
      takeProfitPct: '',
      strategyCode: DEFAULT_STRATEGY_CODE,

      // Task-based progress
      taskId: null,
      taskStatus: null,   // 'pending' | 'fetching' | 'running' | 'saving' | 'done' | 'error'
      taskProgress: 0,

      // Results
      currentResults: null,
      isBacktesting: false,
      backtestError: null,
      lastRunMeta: null,   // { timeframe, symbol, daysBack, startDate, endDate, ranAt }

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
        showBuyAndHold: true,
      },

      // ── Actions ────────────────────────────────────────────────────────────
      setTimeframe: (tf) => set({ timeframe: tf }),
      setSymbol: (s) => set({ symbol: s }),
      setLeverage: (v) => set({ leverage: v }),
      setFeeRate: (v) => set({ feeRate: v }),
      setInitialCapital: (v) => set({ initialCapital: v }),
      setDaysBack: (v) => set({ daysBack: v }),
      setStartDate: (v) => set({ startDate: v }),
      setEndDate: (v) => set({ endDate: v }),
      setStopLossPct: (v) => set({ stopLossPct: v }),
      setTakeProfitPct: (v) => set({ takeProfitPct: v }),
      setStrategyCode: (code) => set({ strategyCode: code }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setCurrentResults: (results) => set({ currentResults: results }),
      setIsBacktesting: (v) => set({ isBacktesting: v }),
      setBacktestError: (e) => set({ backtestError: e }),
      setTaskId: (id) => set({ taskId: id }),
      setTaskStatus: (s) => set({ taskStatus: s }),
      setTaskProgress: (p) => set({ taskProgress: p }),
      setAiPrompt: (p) => set({ aiPrompt: p }),
      setIsGenerating: (v) => set({ isGenerating: v }),
      setIsTweaking: (v) => set({ isTweaking: v }),
      setGeneratedCode: (code) => set({ generatedCode: code }),
      setTweakedCode: (code) => set({ tweakedCode: code }),
      setAiWarning: (w) => set({ aiWarning: w }),
      updateSettings: (s) => set((state) => ({ settings: { ...state.settings, ...s } })),

      setLastRunMeta: (meta) => set({ lastRunMeta: meta }),

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

      resetTask: () => set({ taskId: null, taskStatus: null, taskProgress: 0 }),
      resetResults: () => set({ currentResults: null, backtestError: null }),
    }),
    {
      name: 'sol-backtester-v2',
      partialize: (state) => ({
        timeframe: state.timeframe,
        symbol: state.symbol,
        leverage: state.leverage,
        feeRate: state.feeRate,
        initialCapital: state.initialCapital,
        daysBack: state.daysBack,
        startDate: state.startDate,
        endDate: state.endDate,
        stopLossPct: state.stopLossPct,
        takeProfitPct: state.takeProfitPct,
        strategyCode: state.strategyCode,
        settings: state.settings,
        lastRunMeta: state.lastRunMeta,
      }),
    }
  )
)
