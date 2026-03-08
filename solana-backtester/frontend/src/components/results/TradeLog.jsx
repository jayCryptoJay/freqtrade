import { useState } from 'react'
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'
import { fmtDate, fmtDuration, fmtUSD } from '../../utils/formatters'
import clsx from 'clsx'

export default function TradeLog({ trades }) {
  const [showAll, setShowAll] = useState(false)
  const [sortBy, setSortBy] = useState('entry_time')
  const [sortDir, setSortDir] = useState('desc')

  if (!trades?.length) {
    return (
      <div className="card p-4 text-center">
        <p className="text-gray-500 text-sm">No trades executed</p>
      </div>
    )
  }

  const sorted = [...trades].sort((a, b) => {
    let aVal = a[sortBy], bVal = b[sortBy]
    if (typeof aVal === 'string') aVal = new Date(aVal).getTime()
    if (typeof bVal === 'string') bVal = new Date(bVal).getTime()
    return sortDir === 'desc' ? bVal - aVal : aVal - bVal
  })

  const displayed = showAll ? sorted : sorted.slice(0, 15)

  const handleSort = (col) => {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }) => sortBy === col
    ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)
    : null

  const wins = trades.filter((t) => t.pnl > 0).length
  const losses = trades.filter((t) => t.pnl <= 0).length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-header mb-0">Trade Log</h3>
        <div className="flex gap-3 text-xs">
          <span className="text-accent-green font-mono">{wins}W</span>
          <span className="text-accent-red font-mono">{losses}L</span>
          <span className="text-gray-500">{trades.length} total</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-bg-border bg-bg-elevated">
                {[
                  { key: 'side', label: 'Side' },
                  { key: 'entry_time', label: 'Entry' },
                  { key: 'entry_price', label: 'Price' },
                  { key: 'pnl', label: 'PnL' },
                  { key: 'pnl_pct', label: 'PnL %' },
                  { key: 'duration_hours', label: 'Duration' },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="px-3 py-2.5 text-left text-gray-500 font-medium cursor-pointer hover:text-gray-300 transition-colors whitespace-nowrap"
                  >
                    <span className="flex items-center gap-1">
                      {label}<SortIcon col={key} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((trade, i) => (
                <tr
                  key={i}
                  className="border-b border-bg-border/50 hover:bg-bg-elevated/50 transition-colors"
                >
                  <td className="px-3 py-2">
                    {trade.side === 'long' ? (
                      <span className="flex items-center gap-1 text-accent-green font-semibold">
                        <TrendingUp className="w-3 h-3" />L
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-accent-red font-semibold">
                        <TrendingDown className="w-3 h-3" />S
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                    {fmtDate(trade.entry_time)}
                  </td>
                  <td className="px-3 py-2 font-mono text-gray-300">
                    ${trade.entry_price?.toFixed(2)}
                  </td>
                  <td className={clsx('px-3 py-2 font-mono font-semibold', trade.pnl >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                    {trade.pnl >= 0 ? '+' : ''}{fmtUSD(trade.pnl)}
                  </td>
                  <td className={clsx('px-3 py-2 font-mono', trade.pnl_pct >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                    {trade.pnl_pct >= 0 ? '+' : ''}{trade.pnl_pct?.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2 text-gray-400">
                    {fmtDuration(trade.duration_hours)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {trades.length > 15 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="w-full py-3 text-xs text-sol-purple hover:text-purple-400 transition-colors border-t border-bg-border touch-manipulation"
          >
            {showAll ? `Show less` : `Show all ${trades.length} trades`}
          </button>
        )}
      </div>
    </div>
  )
}
