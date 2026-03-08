import clsx from 'clsx'
import { useAppStore } from '../../store/appStore'

const TIMEFRAMES = [
  { value: '15m', label: '15m', desc: 'Scalping' },
  { value: '1h', label: '1h', desc: 'Intraday' },
  { value: '4h', label: '4h', desc: 'Swing' },
]

export default function TimeframeSelector() {
  const { timeframe, setTimeframe } = useAppStore()

  return (
    <div>
      <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Timeframe</label>
      <div className="grid grid-cols-3 gap-2">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.value}
            onClick={() => setTimeframe(tf.value)}
            className={clsx(
              'flex flex-col items-center py-3 px-2 rounded-xl border transition-all duration-200 touch-manipulation',
              timeframe === tf.value
                ? 'bg-sol-purple/20 border-sol-purple text-white'
                : 'bg-bg-elevated border-bg-border text-gray-400 hover:border-gray-500'
            )}
          >
            <span className="text-lg font-bold font-mono leading-none">{tf.label}</span>
            <span className="text-[10px] text-gray-500 mt-0.5">{tf.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
