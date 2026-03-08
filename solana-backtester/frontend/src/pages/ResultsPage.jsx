import { useState } from 'react'
import { BarChart2, Play, Wand2, ChevronDown, ChevronUp, Clock, Globe } from 'lucide-react'
import Header from '../components/layout/Header'
import MetricsGrid from '../components/results/MetricsGrid'
import EquityChart from '../components/results/EquityChart'
import PriceChart from '../components/results/PriceChart'
import TradeLog from '../components/results/TradeLog'
import TweakWithAI from '../components/ai/TweakWithAI'
import EmptyState from '../components/common/EmptyState'
import { useAppStore } from '../store/appStore'
import { fmtDate } from '../utils/formatters'

function LastRunBadge({ meta }) {
  if (!meta) return null
  return (
    <div className="flex flex-wrap gap-2 text-[10px] text-gray-500">
      <span className="flex items-center gap-1">
        <Globe className="w-3 h-3" />{meta.symbol?.replace('USDT', '/USDT')}
      </span>
      <span className="flex items-center gap-1">
        <Clock className="w-3 h-3" />{meta.timeframe}
      </span>
      <span>·</span>
      <span>{fmtDate(meta.ranAt)}</span>
    </div>
  )
}

export default function ResultsPage() {
  const { currentResults, setActiveTab, initialCapital, settings, lastRunMeta } = useAppStore()
  const [showTweak, setShowTweak] = useState(false)
  const [showPrice, setShowPrice] = useState(true)

  if (!currentResults) {
    return (
      <>
        <Header title="Results" subtitle="Backtest Performance" />
        <div className="page-container flex flex-col justify-center min-h-[60dvh]">
          <EmptyState
            icon={BarChart2}
            title="No Results Yet"
            description={
              lastRunMeta
                ? `Last run: ${lastRunMeta.symbol?.replace('USDT', '/USDT')} ${lastRunMeta.timeframe} on ${fmtDate(lastRunMeta.ranAt)}. Run another backtest to see results.`
                : "Run a backtest to see your strategy's performance metrics, equity curve, and trade log."
            }
            action={
              <button onClick={() => setActiveTab('backtest')} className="btn-primary flex items-center gap-2">
                <Play className="w-4 h-4" />
                {lastRunMeta ? 'Run Again' : 'Run a Backtest'}
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
        subtitle={`${currentResults.symbol?.replace('USDT', '/USDT') || 'SOL/USDT'} · ${currentResults.timeframe || '—'} · ${metrics.total_trades} trades`}
        right={
          <button onClick={() => setActiveTab('backtest')} className="btn-ghost text-xs flex items-center gap-1 px-3 py-2">
            <Play className="w-3.5 h-3.5" />Re-run
          </button>
        }
      />

      <div className="page-container space-y-5">
        <LastRunBadge meta={lastRunMeta} />

        {/* Metrics */}
        <MetricsGrid metrics={metrics} />

        {/* Equity curve */}
        <EquityChart
          equityCurve={equity_curve}
          trades={trades}
          initialCapital={initialCapital}
          showBuyAndHold={settings.showBuyAndHold}
        />

        {/* Price chart with trade markers */}
        <div>
          <button
            onClick={() => setShowPrice((v) => !v)}
            className="w-full flex items-center justify-between card p-3 hover:border-bg-border/80 transition-all touch-manipulation mb-2"
          >
            <span className="text-sm font-medium text-white">Price Chart &amp; Trade Markers</span>
            {showPrice ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
          {showPrice && (
            <div className="animate-fade-in">
              <PriceChart
                priceData={price_data}
                trades={trades}
                showMarkers={settings.showTradeMarkers}
              />
            </div>
          )}
        </div>

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
          {showTweak && <div className="animate-fade-in"><TweakWithAI metrics={metrics} /></div>}
        </div>

        {/* Trade log */}
        <TradeLog trades={trades} />
      </div>
    </>
  )
}
