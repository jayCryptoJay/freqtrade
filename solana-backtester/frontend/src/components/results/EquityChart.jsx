import { useMemo } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Scatter, ScatterChart, ComposedChart, Line
} from 'recharts'
import { fmtDate, fmtUSD } from '../../utils/formatters'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass border border-bg-border rounded-xl p-3 text-xs">
      <p className="text-gray-400 mb-1">{label ? new Date(label).toLocaleString() : ''}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-mono font-semibold">
          {p.name}: {fmtUSD(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function EquityChart({ equityCurve, trades, initialCapital = 10000 }) {
  const chartData = useMemo(() => {
    if (!equityCurve?.length) return []
    // Sample for perf: max 500 points
    const step = Math.max(1, Math.floor(equityCurve.length / 500))
    return equityCurve.filter((_, i) => i % step === 0).map((pt) => ({
      time: pt.time,
      value: pt.value,
      label: new Date(pt.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))
  }, [equityCurve])

  const tradeMarkers = useMemo(() => {
    if (!trades?.length) return { entries: [], exits: [] }
    const entries = trades.slice(0, 100).map((t) => ({
      time: t.entry_time,
      side: t.side,
    }))
    const exits = trades.slice(0, 100).map((t) => ({
      time: t.exit_time,
      pnl: t.pnl,
    }))
    return { entries, exits }
  }, [trades])

  const minVal = useMemo(() => Math.min(...chartData.map((d) => d.value)) * 0.98, [chartData])
  const maxVal = useMemo(() => Math.max(...chartData.map((d) => d.value)) * 1.02, [chartData])
  const finalValue = equityCurve?.[equityCurve.length - 1]?.value || initialCapital
  const isProfit = finalValue >= initialCapital

  if (!chartData.length) {
    return (
      <div className="card p-6 flex items-center justify-center h-48">
        <p className="text-gray-500 text-sm">No equity data to display</p>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-white">Equity Curve</h3>
        <div className="text-right">
          <p className={`text-sm font-bold font-mono ${isProfit ? 'text-accent-green' : 'text-accent-red'}`}>
            {fmtUSD(finalValue)}
          </p>
          <p className="text-[10px] text-gray-500">Final capital</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isProfit ? '#3fb950' : '#f85149'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isProfit ? '#3fb950' : '#f85149'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#6e7681', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minVal, maxVal]}
            tick={{ fill: '#6e7681', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={initialCapital} stroke="#30363d" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="value"
            stroke={isProfit ? '#3fb950' : '#f85149'}
            strokeWidth={2}
            fill="url(#equityGradient)"
            dot={false}
            activeDot={{ r: 4, fill: isProfit ? '#3fb950' : '#f85149' }}
            name="Equity"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
