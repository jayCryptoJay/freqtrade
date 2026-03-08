import { useState } from 'react'
import { Play, Save, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import Header from '../components/layout/Header'
import TimeframeSelector from '../components/backtest/TimeframeSelector'
import BacktestConfig from '../components/backtest/BacktestConfig'
import StrategyEditor from '../components/backtest/StrategyEditor'
import AIPromptInput from '../components/ai/AIPromptInput'
import SaveStrategyModal from '../components/strategies/SaveStrategyModal'
import { LoadingOverlay } from '../components/common/LoadingSpinner'
import { useAppStore } from '../store/appStore'
import { runBacktest } from '../services/api'
import toast from 'react-hot-toast'

export default function BacktestPage() {
  const {
    timeframe, leverage, feeRate, initialCapital, daysBack, strategyCode,
    setCurrentResults, setIsBacktesting, isBacktesting, setBacktestError, setActiveTab,
  } = useAppStore()

  const [showAI, setShowAI] = useState(false)
  const [showSave, setShowSave] = useState(false)

  const handleRun = async () => {
    if (!strategyCode.trim()) {
      toast.error('Write a strategy first')
      return
    }
    setIsBacktesting(true)
    setBacktestError(null)
    try {
      const results = await runBacktest({
        strategy_code: strategyCode,
        timeframe,
        leverage,
        fee_rate: feeRate,
        initial_capital: initialCapital,
        days_back: daysBack,
      })
      setCurrentResults(results)
      setActiveTab('results')
      toast.success(`Backtest complete — ${results.metrics.total_trades} trades`)
    } catch (e) {
      setBacktestError(e.message)
      toast.error(e.message?.slice(0, 120) || 'Backtest failed')
    } finally {
      setIsBacktesting(false)
    }
  }

  return (
    <>
      {isBacktesting && <LoadingOverlay />}
      <Header
        title="SOL Backtester"
        subtitle="SOL/USDT Strategy Testing"
        right={
          <button
            onClick={() => setShowSave(true)}
            className="btn-ghost flex items-center gap-1 text-xs px-3 py-2"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>
        }
      />

      <div className="page-container space-y-5">
        {/* Timeframe */}
        <section>
          <TimeframeSelector />
        </section>

        {/* Config */}
        <section>
          <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Parameters</label>
          <BacktestConfig />
        </section>

        {/* Strategy Editor */}
        <section>
          <StrategyEditor />
        </section>

        {/* AI Section toggle */}
        <section>
          <button
            onClick={() => setShowAI((v) => !v)}
            className="w-full flex items-center justify-between card p-3 hover:border-sol-purple/40 transition-all touch-manipulation"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sol-purple" />
              <span className="text-sm font-medium text-white">AI Strategy Generator</span>
            </div>
            {showAI ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
          {showAI && (
            <div className="mt-2 animate-fade-in">
              <AIPromptInput />
            </div>
          )}
        </section>

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={isBacktesting}
          className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base sticky bottom-20"
        >
          <Play className="w-5 h-5" />
          Run Backtest
        </button>
      </div>

      <SaveStrategyModal
        isOpen={showSave}
        onClose={() => setShowSave(false)}
        onSaved={() => {}}
      />
    </>
  )
}
