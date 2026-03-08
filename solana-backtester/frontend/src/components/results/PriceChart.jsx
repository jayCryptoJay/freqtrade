import { useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, Line, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { fmtUSD } from '../../utils/formatters'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Given a time string from a trade and the chart data array, return the index
 * of the closest data point by string/time comparison.
 */
function findClosestIndex(chartData, timeStr) {
  if (!timeStr || !chartData.length) return -1
  const target = new Date(timeStr).getTime()
  let bestIdx = 0
  let bestDiff = Infinity
  for (let i = 0; i < chartData.length; i++) {
    const t = new Date(chartData[i].time).getTime()
    const diff = Math.abs(t - target)
    if (diff < bestDiff) {
      bestDiff = diff
      bestIdx = i
    }
  }
  return bestIdx
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null

  const pricePayload = payload.find((p) => p.dataKey === 'close')
  const volPayload = payload.find((p) => p.dataKey === 'volume')

  return (
    <div className="glass border border-bg-border rounded-xl p-3 text-xs min-w-[140px]">
      <p className="text-gray-400 mb-1 truncate">
        {label ? new Date(label).toLocaleString() : ''}
      </p>
      {pricePayload && (
        <p className="font-mono font-semibold text-white">
          Price: {fmtUSD(pricePayload.value)}
        </p>
      )}
      {volPayload && (
        <p className="font-mono text-gray-400">
          Vol: {Number(volPayload.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
      )}
      {payload.find((p) => p.payload?._entryTrade) && (
        <p className="text-accent-green font-semibold mt-1">
          Entry ({payload[0].payload._entryTrade.side})
        </p>
      )}
      {payload.find((p) => p.payload?._exitTrade) && (
        <p
          className={`font-semibold mt-1 ${
            payload[0].payload._exitTrade.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'
          }`}
        >
          Exit · {payload[0].payload._exitTrade.pnl >= 0 ? '+' : ''}
          {fmtUSD(payload[0].payload._exitTrade.pnl)}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Custom Dot renderer for the price Line
// ---------------------------------------------------------------------------

/**
 * Renders trade entry/exit markers on price data points.
 * - Long entry  → green upward triangle
 * - Short entry → red downward triangle
 * - Exit        → small white X circle
 */
const TradeDot = (props) => {
  const { cx, cy, payload } = props

  if (!payload) return null

  // Exit marker: small circle with X inside
  if (payload._exitTrade) {
    const { pnl } = payload._exitTrade
    const color = pnl >= 0 ? '#3fb950' : '#f85149'
    return (
      <g key={`exit-${cx}-${cy}`}>
        <circle cx={cx} cy={cy} r={5} fill={color} fillOpacity={0.85} stroke="#0d1117" strokeWidth={1} />
        {/* X lines */}
        <line x1={cx - 3} y1={cy - 3} x2={cx + 3} y2={cy + 3} stroke="#0d1117" strokeWidth={1.5} />
        <line x1={cx + 3} y1={cy - 3} x2={cx - 3} y2={cy + 3} stroke="#0d1117" strokeWidth={1.5} />
      </g>
    )
  }

  // Entry marker: triangle
  if (payload._entryTrade) {
    const { side } = payload._entryTrade
    const isLong = side === 'long'
    const color = isLong ? '#3fb950' : '#f85149'
    const size = 7

    // Upward triangle for long, downward for short
    const points = isLong
      ? `${cx},${cy - size} ${cx - size * 0.8},${cy + size * 0.6} ${cx + size * 0.8},${cy + size * 0.6}`
      : `${cx},${cy + size} ${cx - size * 0.8},${cy - size * 0.6} ${cx + size * 0.8},${cy - size * 0.6}`

    return (
      <g key={`entry-${cx}-${cy}`}>
        <polygon points={points} fill={color} stroke="#0d1117" strokeWidth={1} fillOpacity={0.9} />
      </g>
    )
  }

  // No marker — render nothing (suppress default dot)
  return null
}

// ---------------------------------------------------------------------------
// Volume bar fill helper — coloured by whether this candle closed up or down
// ---------------------------------------------------------------------------

const VolumeBar = (props) => {
  const { x, y, width, height, payload } = props
  if (!payload || height <= 0) return null
  const isUp = payload.close >= payload.open
  const color = isUp ? '#3fb950' : '#f85149'
  return <rect x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.4} />
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PriceChart({ priceData = [], trades = [], showMarkers = true }) {
  // Sample price data to max 600 points for performance
  const chartData = useMemo(() => {
    if (!priceData.length) return []
    const step = Math.max(1, Math.floor(priceData.length / 600))
    return priceData.filter((_, i) => i % step === 0).map((pt) => ({
      time: pt.time,
      open: pt.open,
      high: pt.high,
      low: pt.low,
      close: pt.close,
      volume: pt.volume,
      label: new Date(pt.time).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      // Trade marker fields — populated below
      _entryTrade: null,
      _exitTrade: null,
    }))
  }, [priceData])

  // Attach trade markers to the nearest chart data points
  const annotatedData = useMemo(() => {
    if (!chartData.length || !showMarkers || !trades.length) return chartData

    // Clone the array shallowly so we don't mutate the memoized base
    const data = chartData.map((pt) => ({ ...pt }))

    // Limit to 80 trades to avoid overwhelming the chart
    const limitedTrades = trades.slice(0, 80)

    for (const trade of limitedTrades) {
      // Entry marker
      const entryIdx = findClosestIndex(data, trade.entry_time)
      if (entryIdx >= 0) {
        // Prefer attaching entry; if already occupied pick the next index
        const target = data[entryIdx]
        if (!target._entryTrade) {
          target._entryTrade = { side: trade.side, price: trade.entry_price }
        }
      }

      // Exit marker
      const exitIdx = findClosestIndex(data, trade.exit_time)
      if (exitIdx >= 0) {
        const target = data[exitIdx]
        if (!target._exitTrade) {
          target._exitTrade = { pnl: trade.pnl, price: trade.exit_price }
        }
      }
    }

    return data
  }, [chartData, trades, showMarkers])

  // Price range for Y-axis padding
  const { minPrice, maxPrice } = useMemo(() => {
    if (!annotatedData.length) return { minPrice: 0, maxPrice: 100 }
    const closes = annotatedData.map((d) => d.close)
    const mn = Math.min(...closes)
    const mx = Math.max(...closes)
    const pad = (mx - mn) * 0.05 || mx * 0.02
    return { minPrice: mn - pad, maxPrice: mx + pad }
  }, [annotatedData])

  const maxVolume = useMemo(() => {
    if (!annotatedData.length) return 1
    return Math.max(...annotatedData.map((d) => d.volume || 0))
  }, [annotatedData])

  const currentPrice = annotatedData[annotatedData.length - 1]?.close
  const openPrice = annotatedData[0]?.close
  const isPriceUp = currentPrice !== undefined && openPrice !== undefined && currentPrice >= openPrice

  if (!annotatedData.length) {
    return (
      <div className="card p-4 flex items-center justify-center h-[260px]">
        <p className="text-gray-500 text-sm">No price data to display</p>
      </div>
    )
  }

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isPriceUp ? (
            <TrendingUp size={14} className="text-accent-green" />
          ) : (
            <TrendingDown size={14} className="text-accent-red" />
          )}
          <h3 className="text-sm font-semibold text-white">Price Chart (SOL/USDT)</h3>
        </div>
        <div className="text-right">
          <p
            className={`text-sm font-bold font-mono ${
              isPriceUp ? 'text-accent-green' : 'text-accent-red'
            }`}
          >
            {currentPrice !== undefined ? fmtUSD(currentPrice) : '—'}
          </p>
          <p className="text-[10px] text-gray-500">Current price</p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart
          data={annotatedData}
          margin={{ top: 4, right: 6, left: -16, bottom: 0 }}
        >
          <defs>
            {/* Volume gradient overlay — not strictly needed but keeps it subtle */}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />

          <XAxis
            dataKey="time"
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }
            tick={{ fill: '#6e7681', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />

          {/* Primary Y axis — price */}
          <YAxis
            yAxisId="price"
            domain={[minPrice, maxPrice]}
            tick={{ fill: '#6e7681', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            width={52}
          />

          {/* Secondary Y axis — volume, occupies roughly bottom 20% */}
          <YAxis
            yAxisId="volume"
            orientation="right"
            domain={[0, maxVolume * 5]} // scale so bars stay in bottom ~20%
            tick={false}
            tickLine={false}
            axisLine={false}
            width={0}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: '#6e7681', strokeWidth: 1, strokeDasharray: '3 3' }}
          />

          {/* Volume bars — rendered first so price line sits on top */}
          <Bar
            yAxisId="volume"
            dataKey="volume"
            shape={<VolumeBar />}
            isAnimationActive={false}
          />

          {/* Close price line with trade markers */}
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="close"
            stroke="#8b949e"
            strokeWidth={1.5}
            dot={(dotProps) => {
              const { payload } = dotProps
              if (!payload) return null
              if (showMarkers && (payload._entryTrade || payload._exitTrade)) {
                return <TradeDot {...dotProps} key={`dot-${dotProps.index}`} />
              }
              return null
            }}
            activeDot={{ r: 3, fill: '#8b949e', stroke: '#0d1117', strokeWidth: 1 }}
            name="Close"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      {showMarkers && trades.length > 0 && (
        <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <polygon points="5,0 0,10 10,10" fill="#3fb950" fillOpacity={0.9} />
            </svg>
            Long entry
          </span>
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <polygon points="5,10 0,0 10,0" fill="#f85149" fillOpacity={0.9} />
            </svg>
            Short entry
          </span>
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <circle cx="5" cy="5" r="4" fill="#8b949e" fillOpacity={0.85} />
              <line x1="3" y1="3" x2="7" y2="7" stroke="#0d1117" strokeWidth={1.5} />
              <line x1="7" y1="3" x2="3" y2="7" stroke="#0d1117" strokeWidth={1.5} />
            </svg>
            Exit
          </span>
        </div>
      )}
    </div>
  )
}
