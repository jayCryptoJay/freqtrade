import clsx from 'clsx'
import { fmtPct, fmtNum, fmtDuration } from '../../utils/formatters'
import { TrendingUp, TrendingDown } from 'lucide-react'

function MetricCard({ label, value, color, sub, highlight }) {
  return (
    <div className={clsx('metric-card', highlight && 'border-sol-purple/30 bg-sol-purple/5')}>
      <span className="metric-label">{label}</span>
      <span className={clsx('metric-value', color)}>{value}</span>
      {sub && <span className="text-[10px] text-gray-600">{sub}</span>}
    </div>
  )
}

function BahBanner({ strategyReturn, bahReturn }) {
  if (bahReturn === null || bahReturn === undefined) return null
  const diff = (strategyReturn ?? 0) - bahReturn
  const beating = diff >= 0
  return (
    <div className={clsx(
      'card p-3 flex items-center justify-between',
      beating ? 'border-accent-green/20 bg-accent-green/5' : 'border-accent-red/20 bg-accent-red/5'
    )}>
      <div className="flex items-center gap-2">
        {beating
          ? <TrendingUp className="w-4 h-4 text-accent-green" />
          : <TrendingDown className="w-4 h-4 text-accent-red" />}
        <div>
          <p className="text-xs font-semibold text-white">
            {beating ? 'Beating' : 'Underperforming'} Buy & Hold
          </p>
          <p className="text-[10px] text-gray-500">
            Strategy {fmtPct(strategyReturn)} vs B&amp;H {fmtPct(bahReturn)}
          </p>
        </div>
      </div>
      <span className={clsx('text-sm font-bold font-mono', beating ? 'text-accent-green' : 'text-accent-red')}>
        {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
      </span>
    </div>
  )
}

export default function MetricsGrid({ metrics }) {
  if (!metrics) return null
  const {
    total_return, max_drawdown, sharpe_ratio, sortino_ratio, calmar_ratio,
    win_rate, profit_factor, total_trades, avg_trade_duration,
    max_consecutive_losses, max_consecutive_wins, annualized_return, bah_return,
  } = metrics

  return (
    <div className="space-y-3">
      <h3 className="section-header">Performance Summary</h3>

      <BahBanner strategyReturn={total_return} bahReturn={bah_return} />

      {/* Primary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Total Return" value={fmtPct(total_return)}
          color={total_return >= 0 ? 'text-accent-green' : 'text-accent-red'} highlight />
        <MetricCard label="Annualized" value={fmtPct(annualized_return)}
          color={annualized_return >= 0 ? 'text-accent-green' : 'text-accent-red'} sub="per year" />
        <MetricCard label="Max Drawdown" value={fmtPct(max_drawdown)} color="text-accent-red" />
        <MetricCard label="Win Rate" value={`${fmtNum(win_rate, 1)}%`}
          color={win_rate >= 55 ? 'text-accent-green' : win_rate >= 45 ? 'text-accent-orange' : 'text-accent-red'}
          sub={`${total_trades ?? 0} trades`} />
      </div>

      {/* Risk-adjusted */}
      <div>
        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Risk-Adjusted Ratios</p>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Sharpe" value={fmtNum(sharpe_ratio, 3)}
            color={sharpe_ratio >= 1 ? 'text-accent-green' : sharpe_ratio >= 0 ? 'text-accent-orange' : 'text-accent-red'}
            sub={sharpe_ratio >= 2 ? 'Excellent' : sharpe_ratio >= 1 ? 'Good' : sharpe_ratio >= 0.5 ? 'Moderate' : 'Poor'} />
          <MetricCard label="Sortino" value={fmtNum(sortino_ratio, 3)}
            color={sortino_ratio >= 1.5 ? 'text-accent-green' : sortino_ratio >= 0 ? 'text-accent-orange' : 'text-accent-red'}
            sub="downside-adj" />
          <MetricCard label="Calmar" value={fmtNum(calmar_ratio, 3)}
            color={calmar_ratio >= 1 ? 'text-accent-green' : calmar_ratio >= 0.5 ? 'text-accent-orange' : 'text-accent-red'}
            sub="return/DD" />
        </div>
      </div>

      {/* Trade stats */}
      <div>
        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Trade Stats</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Profit Factor" value={fmtNum(profit_factor, 3)}
            color={profit_factor >= 1.5 ? 'text-accent-green' : profit_factor >= 1 ? 'text-accent-orange' : 'text-accent-red'} />
          <MetricCard label="Avg Duration" value={fmtDuration(avg_trade_duration)} color="text-gray-300" />
          <MetricCard label="Max Consec. Losses" value={max_consecutive_losses ?? '—'}
            color={max_consecutive_losses >= 5 ? 'text-accent-red' : 'text-gray-300'} />
          <MetricCard label="Max Consec. Wins" value={max_consecutive_wins ?? '—'}
            color={max_consecutive_wins >= 5 ? 'text-accent-green' : 'text-gray-300'} />
        </div>
      </div>
    </div>
  )
}
