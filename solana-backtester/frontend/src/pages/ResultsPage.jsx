import { BarChart2, Play, Wand2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import Header from '../components/layout/Header'
import MetricsGrid from '../components/results/MetricsGrid'
import EquityChart from '../components/results/EquityChart'
import TradeLog from '../components/results/TradeLog'
import TweakWithAI from '../components/ai/TweakWithAI'
import EmptyState from '../components/common/EmptyState'
import { useAppStore } from '../store/appStore'

export default function ResultsPage() {
  const { currentResults, setActiveTab, initialCapital } = useAppStore()
  const [showTweak, setShowTweak] = useState(false)

  if (!currentResults) {
    return (
      <>
        <Header title="Results" subtitle="Backtest Performance" />
        <div className="page-container flex flex-col justify-center min-h-[60dvh]">
          <EmptyState
            icon={BarChart2}
            title="No Results Yet"
            description="Run a backtest to see your strategy's performance metrics, equity curve, and trade log."
            action={
              <button onClick={() => setActiveTab('backtest')} className="btn-primary flex items-center gap-2">
                <Play className="w-4 h-4" />
                Run a Backtest
              </button>
            }
          />
        </div>
      </>
    )
  }

  const { metrics, equity_curve, trades, price_data } = currentResults

  return (
    <>
      <Header
        title="Results"
        subtitle={`${metrics.total_trades} trades · ${currentResults?.timeframe || '—'}`}
        right={
          <button
            onClick={() => setActiveTab('backtest')}
            className="btn-ghost text-xs flex items-center gap-1 px-3 py-2"
          >
            <Play className="w-3.5 h-3.5" />
            Re-run
          </button>
        }
      />

      <div className="page-container space-y-5">
        {/* Metrics */}
        <MetricsGrid metrics={metrics} />

        {/* Equity Curve */}
        <EquityChart
          equityCurve={equity_curve}
          trades={trades}
          initialCapital={initialCapital}
        />

        {/* AI Tweak */}
        <div>
          <button
            onClick={() => setShowTweak((v) => !v)}
            className="w-full flex items-center justify-between card p-3 hover:border-sol-purple/40 transition-all touch-manipulation mb-2"
          >
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-accent-purple" />
              <span className="text-sm font-medium text-white">Tweak with AI</span>
            </div>
            {showTweak ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
          {showTweak && (
            <div className="animate-fade-in">
              <TweakWithAI metrics={metrics} />
            </div>
          )}
        </div>

        {/* Trade Log */}
        <TradeLog trades={trades} />
      </div>
    </>
  )
}
