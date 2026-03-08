import { Star, TrendingUp, TrendingDown, BarChart2, Trash2, Play } from 'lucide-react'
import { fmtPct, fmtNum } from '../../utils/formatters'
import { toggleFavorite, deleteStrategy } from '../../services/api'
import { useAppStore } from '../../store/appStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function StrategyCard({ strategy, onRefresh, onLoad }) {
  const { setStrategyCode, setActiveTab } = useAppStore()
  const bt = strategy.best_backtest

  const handleFavorite = async (e) => {
    e.stopPropagation()
    try {
      await toggleFavorite(strategy.id)
      onRefresh?.()
    } catch {
      toast.error('Failed to update favorite')
    }
  }

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!confirm(`Delete "${strategy.name}"?`)) return
    try {
      await deleteStrategy(strategy.id)
      toast.success('Strategy deleted')
      onRefresh?.()
    } catch {
      toast.error('Failed to delete strategy')
    }
  }

  const handleLoad = (e) => {
    e.stopPropagation()
    setStrategyCode(strategy.code)
    setActiveTab('backtest')
    toast.success(`Loaded: ${strategy.name}`)
  }

  return (
    <div className="card p-4 space-y-3 hover:border-bg-border/80 transition-all duration-200 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm leading-tight truncate">{strategy.name}</h3>
          {strategy.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{strategy.description}</p>
          )}
        </div>
        <button
          onClick={handleFavorite}
          className={clsx(
            'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 touch-manipulation shrink-0',
            strategy.is_favorite ? 'text-accent-orange' : 'text-gray-600 hover:text-gray-400'
          )}
        >
          <Star className={clsx('w-4 h-4', strategy.is_favorite && 'fill-current')} />
        </button>
      </div>

      {/* Tags */}
      {strategy.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {strategy.tags.map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      )}

      {/* Metrics */}
      {bt ? (
        <div className="grid grid-cols-4 gap-2 bg-bg-elevated rounded-xl p-3">
          <div className="text-center">
            <p className={clsx('text-sm font-bold font-mono', bt.total_return >= 0 ? 'text-accent-green' : 'text-accent-red')}>
              {fmtPct(bt.total_return, 1)}
            </p>
            <p className="text-[10px] text-gray-600">Return</p>
          </div>
          <div className="text-center">
            <p className={clsx('text-sm font-bold font-mono', bt.sharpe_ratio >= 1 ? 'text-accent-green' : bt.sharpe_ratio >= 0 ? 'text-accent-orange' : 'text-accent-red')}>
              {fmtNum(bt.sharpe_ratio, 2)}
            </p>
            <p className="text-[10px] text-gray-600">Sharpe</p>
          </div>
          <div className="text-center">
            <p className={clsx('text-sm font-bold font-mono', bt.win_rate >= 55 ? 'text-accent-green' : 'text-accent-orange')}>
              {fmtNum(bt.win_rate, 1)}%
            </p>
            <p className="text-[10px] text-gray-600">Win Rate</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold font-mono text-accent-red">
              {fmtPct(bt.max_drawdown, 1)}
            </p>
            <p className="text-[10px] text-gray-600">Drawdown</p>
          </div>
        </div>
      ) : (
        <div className="bg-bg-elevated rounded-xl p-3 text-center">
          <p className="text-xs text-gray-600">No backtest results yet</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleLoad}
          className="btn-primary flex-1 text-xs py-2 flex items-center justify-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5" />
          Load & Backtest
        </button>
        <button
          onClick={handleDelete}
          className="btn-danger text-xs py-2 px-3 flex items-center justify-center"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
