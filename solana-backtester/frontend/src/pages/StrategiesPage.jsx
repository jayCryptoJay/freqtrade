import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Search, Star, SlidersHorizontal, RefreshCw, Plus } from 'lucide-react'
import Header from '../components/layout/Header'
import StrategyCard from '../components/strategies/StrategyCard'
import SaveStrategyModal from '../components/strategies/SaveStrategyModal'
import EmptyState from '../components/common/EmptyState'
import { SkeletonCard } from '../components/common/LoadingSpinner'
import { listStrategies } from '../services/api'
import { useAppStore } from '../store/appStore'
import clsx from 'clsx'

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Newest' },
  { value: 'sharpe_ratio', label: 'Sharpe' },
  { value: 'total_return', label: 'Return' },
  { value: 'win_rate', label: 'Win Rate' },
]

export default function StrategiesPage() {
  const { setActiveTab } = useAppStore()
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [showSave, setShowSave] = useState(false)

  const fetchStrategies = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listStrategies({
        sort_by: sortBy,
        order: 'desc',
        favorites_only: favoritesOnly,
        search: search || undefined,
      })
      setStrategies(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [sortBy, favoritesOnly, search])

  useEffect(() => {
    const timer = setTimeout(fetchStrategies, 300)
    return () => clearTimeout(timer)
  }, [fetchStrategies])

  return (
    <>
      <Header
        title="Strategy Library"
        subtitle={`${strategies.length} saved strategies`}
        right={
          <button
            onClick={() => setShowSave(true)}
            className="btn-ghost text-xs flex items-center gap-1 px-3 py-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Save Current
          </button>
        }
      />

      <div className="page-container space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search strategies..."
            className="input-field pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setFavoritesOnly((v) => !v)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all shrink-0 touch-manipulation',
              favoritesOnly
                ? 'bg-accent-orange/20 border-accent-orange text-accent-orange'
                : 'bg-bg-elevated border-bg-border text-gray-400'
            )}
          >
            <Star className={clsx('w-3.5 h-3.5', favoritesOnly && 'fill-current')} />
            Favorites
          </button>

          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={clsx(
                'px-3 py-2 rounded-xl border text-xs font-medium transition-all shrink-0 touch-manipulation',
                sortBy === opt.value
                  ? 'bg-sol-purple/20 border-sol-purple text-sol-purple'
                  : 'bg-bg-elevated border-bg-border text-gray-400'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} lines={4} />)}
          </div>
        ) : strategies.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No strategies saved"
            description="Run a backtest and save your strategy to build your library."
            action={
              <button onClick={() => setActiveTab('backtest')} className="btn-primary">
                Create a Strategy
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {strategies.map((s) => (
              <StrategyCard
                key={s.id}
                strategy={s}
                onRefresh={fetchStrategies}
              />
            ))}
          </div>
        )}
      </div>

      <SaveStrategyModal
        isOpen={showSave}
        onClose={() => setShowSave(false)}
        onSaved={fetchStrategies}
      />
    </>
  )
}
