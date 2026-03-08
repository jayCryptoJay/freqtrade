import { useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts'
import { fmtUSD } from '../../utils/formatters'

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass border border-bg-border rounded-xl p-3 text-xs space-y-1">
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-mono font-semibold">
          {p.name}: {fmtUSD(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function EquityChart({
  equityCurve,
  trades,
  initialCapital = 10000,
  showBuyAndHold = true,
}) {
  const chartData = useMemo(() => {
    if (!equityCurve?.length) return []
    // Already sampled by backend; use as-is but cap at 800 pts for safety
    const step = Math.max(1, Math.floor(equityCurve.length / 800))
    return equityCurve
      .filter((_, i) => i % step === 0)
      .map((pt) => ({
        label: new Date(pt.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: pt.value,
        bah: pt.bah ?? null,
      }))
  }, [equityCurve])

  const finalValue = equityCurve?.[equityCurve.length - 1]?.value ?? initialCapital
  const isProfit = finalValue >= initialCapital

  const allVals = chartData.flatMap((d) => [d.value, showBuyAndHold && d.bah ? d.bah : d.value])
  const minVal = Math.min(...allVals) * 0.97
  const maxVal = Math.max(...allVals) * 1.03

  if (!chartData.length) {
    return (
      <div className="card p-6 flex items-center justify-center h-48">
        <p className="text-gray-500 text-sm">No equity data to display</p>
      </div>
    )
  }

  const stratColor = isProfit ? '#3fb950' : '#f85149'
  const bahColor = '#58a6ff'

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Equity Curve</h3>
        <div className="text-right">
          <p className={`text-sm font-bold font-mono ${isProfit ? 'text-accent-green' : 'text-accent-red'}`}>
            {fmtUSD(finalValue)}
          </p>
          <p className="text-[10px] text-gray-500">Final capital</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={210}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={stratColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={stratColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#6e7681', fontSize: 10 }}
            tickLine={false} axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minVal, maxVal]}
            tick={{ fill: '#6e7681', fontSize: 10 }}
            tickLine={false} axisLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={initialCapital} stroke="#30363d" strokeDasharray="4 4" />

          {/* Buy & hold line */}
          {showBuyAndHold && (
            <Line
              type="monotone"
              dataKey="bah"
              name="Buy &amp; Hold"
              stroke={bahColor}
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          )}

          {/* Strategy equity */}
          <Area
            type="monotone"
            dataKey="value"
            name="Strategy"
            stroke={stratColor}
            strokeWidth={2}
            fill="url(#equityGrad)"
            dot={false}
            activeDot={{ r: 4, fill: stratColor }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {showBuyAndHold && (
        <div className="flex items-center gap-4 mt-2 justify-center text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-4 h-0.5 inline-block rounded" style={{ background: stratColor }} />
            Strategy
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-px inline-block rounded border-t border-dashed border-accent-blue" />
            Buy &amp; Hold
          </span>
        </div>
      )}
    </div>
  )
}
