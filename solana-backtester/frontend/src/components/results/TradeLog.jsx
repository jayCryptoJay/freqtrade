import { useState, useRef, useCallback } from 'react'
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Download } from 'lucide-react'
import { fmtDate, fmtDuration, fmtUSD } from '../../utils/formatters'
import clsx from 'clsx'

const PAGE_SIZE = 40

function exportCSV(trades) {
  const headers = ['Side', 'Entry Time', 'Exit Time', 'Entry Price', 'Exit Price', 'PnL ($)', 'PnL (%)', 'Duration (h)']
  const rows = trades.map((t) => [
    t.side,
    t.entry_time,
    t.exit_time,
    t.entry_price,
    t.exit_price,
    t.pnl,
    t.pnl_pct,
    t.duration_hours,
  ])
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trades_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function TradeLog({ trades }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [sortBy, setSortBy] = useState('entry_time')
  const [sortDir, setSortDir] = useState('desc')
  const loaderRef = useRef(null)

  // Intersection observer for infinite scroll
  const observerRef = useCallback((node) => {
    if (!node) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((v) => v + PAGE_SIZE)
      },
      { threshold: 0.1 }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [])

  if (!trades?.length) {
    return (
      <div className="card p-4 text-center">
        <p className="text-gray-500 text-sm">No trades executed</p>
      </div>
    )
  }

  const sorted = [...trades].sort((a, b) => {
    let av = a[sortBy], bv = b[sortBy]
    if (typeof av === 'string') av = new Date(av).getTime()
    if (typeof bv === 'string') bv = new Date(bv).getTime()
    return sortDir === 'desc' ? bv - av : av - bv
  })

  const visible = sorted.slice(0, visibleCount)
  const wins = trades.filter((t) => t.pnl > 0).length
  const losses = trades.length - wins

  const handleSort = (col) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }) =>
    sortBy === col ? (
      sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
    ) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-header mb-0">Trade Log</h3>
        <div className="flex items-center gap-3">
          <div className="flex gap-3 text-xs">
            <span className="text-accent-green font-mono">{wins}W</span>
            <span className="text-accent-red font-mono">{losses}L</span>
            <span className="text-gray-500">{trades.length} total</span>
          </div>
          <button
            onClick={() => exportCSV(trades)}
            title="Export CSV"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-bg-elevated border border-bg-border rounded-lg px-2.5 py-1.5 transition-colors touch-manipulation"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
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
                    className="px-3 py-2.5 text-left text-gray-500 font-medium cursor-pointer hover:text-gray-300 transition-colors whitespace-nowrap select-none"
                  >
                    <span className="flex items-center gap-1">{label}<SortIcon col={key} /></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((trade, i) => (
                <tr key={i} className="border-b border-bg-border/50 hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-3 py-2">
                    {trade.side === 'long'
                      ? <span className="flex items-center gap-1 text-accent-green font-semibold"><TrendingUp className="w-3 h-3" />L</span>
                      : <span className="flex items-center gap-1 text-accent-red font-semibold"><TrendingDown className="w-3 h-3" />S</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{fmtDate(trade.entry_time)}</td>
                  <td className="px-3 py-2 font-mono text-gray-300">${trade.entry_price?.toFixed(2)}</td>
                  <td className={clsx('px-3 py-2 font-mono font-semibold', trade.pnl >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                    {trade.pnl >= 0 ? '+' : ''}{fmtUSD(trade.pnl)}
                  </td>
                  <td className={clsx('px-3 py-2 font-mono', trade.pnl_pct >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                    {trade.pnl_pct >= 0 ? '+' : ''}{trade.pnl_pct?.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2 text-gray-400">{fmtDuration(trade.duration_hours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Infinite scroll sentinel */}
        {visibleCount < sorted.length && (
          <div ref={observerRef} className="py-3 text-center text-xs text-gray-600">
            Showing {visibleCount} of {sorted.length} trades — scroll to load more
          </div>
        )}
      </div>
    </div>
  )
}
