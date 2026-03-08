import clsx from 'clsx'
import { fmtPct, fmtNum, fmtDuration } from '../../utils/formatters'

function MetricCard({ label, value, color, sub }) {
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <span className={clsx('metric-value', color)}>{value}</span>
      {sub && <span className="text-[10px] text-gray-600">{sub}</span>}
    </div>
  )
}

export default function MetricsGrid({ metrics }) {
  if (!metrics) return null
  const {
    total_return, max_drawdown, sharpe_ratio, win_rate,
    profit_factor, total_trades, avg_trade_duration,
  } = metrics

  return (
    <div>
      <h3 className="section-header">Performance Summary</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Total Return"
          value={fmtPct(total_return)}
          color={total_return >= 0 ? 'text-accent-green' : 'text-accent-red'}
        />
        <MetricCard
          label="Max Drawdown"
          value={fmtPct(max_drawdown)}
          color="text-accent-red"
        />
        <MetricCard
          label="Sharpe Ratio"
          value={fmtNum(sharpe_ratio, 3)}
          color={sharpe_ratio >= 1 ? 'text-accent-green' : sharpe_ratio >= 0 ? 'text-accent-orange' : 'text-accent-red'}
          sub={sharpe_ratio >= 1 ? 'Good' : sharpe_ratio >= 0.5 ? 'Moderate' : 'Poor'}
        />
        <MetricCard
          label="Win Rate"
          value={`${fmtNum(win_rate, 1)}%`}
          color={win_rate >= 55 ? 'text-accent-green' : win_rate >= 45 ? 'text-accent-orange' : 'text-accent-red'}
        />
        <MetricCard
          label="Profit Factor"
          value={fmtNum(profit_factor, 3)}
          color={profit_factor >= 1.5 ? 'text-accent-green' : profit_factor >= 1 ? 'text-accent-orange' : 'text-accent-red'}
        />
        <MetricCard
          label="Total Trades"
          value={total_trades ?? '—'}
          color="text-white"
        />
        <MetricCard
          label="Avg Duration"
          value={fmtDuration(avg_trade_duration)}
          color="text-gray-300"
        />
        <MetricCard
          label="Expectancy"
          value={total_trades ? fmtPct((total_return || 0) / (total_trades || 1), 3) : '—'}
          color="text-accent-blue"
          sub="per trade"
        />
      </div>
    </div>
  )
}
