import { useState, useRef } from 'react'
import { Play, Save, Sparkles, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import Header from '../components/layout/Header'
import TimeframeSelector from '../components/backtest/TimeframeSelector'
import BacktestConfig from '../components/backtest/BacktestConfig'
import StrategyEditor from '../components/backtest/StrategyEditor'
import AIPromptInput from '../components/ai/AIPromptInput'
import SaveStrategyModal from '../components/strategies/SaveStrategyModal'
import { useAppStore } from '../store/appStore'
import { startBacktest, pollBacktestTask } from '../services/api'
import toast from 'react-hot-toast'

function validateCode(code) {
  if (!code.trim()) return 'Strategy code cannot be empty'
  if (!code.includes('def strategy(')) return "Must define a function named 'strategy(df)'"
  if (!code.includes('return')) return 'strategy() must return a pandas Series'
  return null
}

function ProgressOverlay({ progress, status }) {
  const labels = {
    pending: 'Starting up…',
    fetching: 'Fetching market data from Binance…',
    running: 'Simulating trades candle by candle…',
    saving: 'Saving results…',
  }
  const pct = Math.round((progress ?? 0) * 100)
  return (
    <div className="fixed inset-0 bg-bg-primary/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-5 px-8">
      <div className="w-14 h-14 rounded-2xl bg-sol-purple/20 flex items-center justify-center">
        <Play className="w-7 h-7 text-sol-purple" />
      </div>
      <div className="text-center">
        <p className="text-white font-semibold text-lg">{labels[status] || 'Processing…'}</p>
        <p className="text-xs text-gray-500 mt-1">{pct}% complete</p>
      </div>
      <div className="w-full max-w-xs bg-bg-elevated rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-sol-purple rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function BacktestPage() {
  const {
    timeframe, symbol, leverage, feeRate, initialCapital, daysBack,
    startDate, endDate, stopLossPct, takeProfitPct, strategyCode,
    setCurrentResults, setIsBacktesting, isBacktesting, setBacktestError,
    setActiveTab, setLastRunMeta,
    taskProgress, taskStatus, setTaskProgress, setTaskStatus, resetTask,
  } = useAppStore()

  const [showAI, setShowAI] = useState(false)
  const [showSave, setShowSave] = useState(false)
  const [codeError, setCodeError] = useState(null)

  const handleRun = async () => {
    const err = validateCode(strategyCode)
    if (err) { setCodeError(err); toast.error(err); return }
    setCodeError(null)
    setIsBacktesting(true)
    setBacktestError(null)
    resetTask()
    setTaskStatus('pending')
    setTaskProgress(0)

    try {
      const { task_id } = await startBacktest({
        strategy_code: strategyCode,
        timeframe, symbol, leverage,
        fee_rate: feeRate,
        initial_capital: initialCapital,
        days_back: daysBack,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        stop_loss_pct: stopLossPct ? parseFloat(stopLossPct) / 100 : undefined,
        take_profit_pct: takeProfitPct ? parseFloat(takeProfitPct) / 100 : undefined,
      })

      const result = await pollBacktestTask(
        task_id,
        (p, s) => { setTaskProgress(p); setTaskStatus(s) },
        600,
      )

      setCurrentResults({ ...result, timeframe, symbol })
      setLastRunMeta({
        timeframe, symbol, daysBack,
        startDate, endDate,
        ranAt: new Date().toISOString(),
      })
      setActiveTab('results')
      const r = result.metrics
      toast.success(`Done — ${r.total_trades} trades · ${r.total_return >= 0 ? '+' : ''}${r.total_return?.toFixed(2)}%`)
    } catch (e) {
      setBacktestError(e.message)
      toast.error(e.message?.slice(0, 120) || 'Backtest failed')
    } finally {
      setIsBacktesting(false)
      resetTask()
    }
  }

  return (
    <>
      {isBacktesting && <ProgressOverlay progress={taskProgress} status={taskStatus} />}

      <Header
        title="SOL Backtester"
        subtitle={`${symbol?.replace('USDT', '/USDT')} · ${timeframe}`}
        right={
          <button onClick={() => setShowSave(true)} className="btn-ghost flex items-center gap-1 text-xs px-3 py-2">
            <Save className="w-3.5 h-3.5" />Save
          </button>
        }
      />

      <div className="page-container space-y-5">
        <TimeframeSelector />
        <BacktestConfig />
        <StrategyEditor />

        {codeError && (
          <div className="flex items-start gap-2 bg-accent-red/10 border border-accent-red/30 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-accent-red shrink-0 mt-0.5" />
            <p className="text-xs text-accent-red">{codeError}</p>
          </div>
        )}

        {/* AI generator accordion */}
        <div>
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
          {showAI && <div className="mt-2 animate-fade-in"><AIPromptInput /></div>}
        </div>

        <button
          onClick={handleRun}
          disabled={isBacktesting}
          className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base"
        >
          <Play className="w-5 h-5" />
          Run Backtest
        </button>
      </div>

      <SaveStrategyModal isOpen={showSave} onClose={() => setShowSave(false)} />
    </>
  )
}
