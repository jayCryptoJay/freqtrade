import { useState, useEffect, useCallback, useRef } from 'react'
import { BookOpen, Search, Star, Plus, History } from 'lucide-react'
import { useSwipeable } from 'react-swipeable'
import Header from '../components/layout/Header'
import StrategyCard from '../components/strategies/StrategyCard'
import SaveStrategyModal from '../components/strategies/SaveStrategyModal'
import VersionHistory from '../components/strategies/VersionHistory'
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
  const { setActiveTab, setStrategyCode } = useAppStore()
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [showSave, setShowSave] = useState(false)

  // Swipe navigation between strategies (detail view)
  const [activeIndex, setActiveIndex] = useState(null) // null = list view
  const [versionStrategyId, setVersionStrategyId] = useState(null)

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
    const t = setTimeout(fetchStrategies, 300)
    return () => clearTimeout(t)
  }, [fetchStrategies])

  // Swipe handlers for navigating between strategy cards when one is "focused"
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (activeIndex !== null && activeIndex < strategies.length - 1)
        setActiveIndex((i) => i + 1)
    },
    onSwipedRight: () => {
      if (activeIndex !== null && activeIndex > 0)
        setActiveIndex((i) => i - 1)
    },
    preventScrollOnSwipe: true,
    trackMouse: false,
  })

  return (
    <>
      <Header
        title="Strategy Library"
        subtitle={`${strategies.length} saved`}
        right={
          <button onClick={() => setShowSave(true)} className="btn-ghost text-xs flex items-center gap-1 px-3 py-2">
            <Plus className="w-3.5 h-3.5" />Save Current
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
            placeholder="Search strategies…"
            className="input-field pl-9"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setFavoritesOnly((v) => !v)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium shrink-0 touch-manipulation transition-all',
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
                'px-3 py-2 rounded-xl border text-xs font-medium shrink-0 touch-manipulation transition-all',
                sortBy === opt.value
                  ? 'bg-sol-purple/20 border-sol-purple text-sol-purple'
                  : 'bg-bg-elevated border-bg-border text-gray-400'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Swipe hint when a strategy is focused */}
        {activeIndex !== null && strategies.length > 1 && (
          <p className="text-center text-[10px] text-gray-600">
            ← swipe to navigate · {activeIndex + 1} of {strategies.length} →
          </p>
        )}

        {/* Strategy list / swipe container */}
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} lines={4} />)}</div>
        ) : strategies.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No strategies saved"
            description="Run a backtest and save your strategy to build your personal library."
            action={
              <button onClick={() => setActiveTab('backtest')} className="btn-primary">
                Create a Strategy
              </button>
            }
          />
        ) : (
          <div {...swipeHandlers} className="space-y-3">
            {strategies.map((s, idx) => (
              <div
                key={s.id}
                onClick={() => setActiveIndex(idx === activeIndex ? null : idx)}
                className={clsx(
                  'transition-all duration-200',
                  activeIndex !== null && activeIndex !== idx && 'opacity-50 scale-[0.98]'
                )}
              >
                <StrategyCard
                  strategy={s}
                  onRefresh={fetchStrategies}
                  onShowVersions={() => setVersionStrategyId(s.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <SaveStrategyModal isOpen={showSave} onClose={() => setShowSave(false)} onSaved={fetchStrategies} />

      {/* Version history modal */}
      {versionStrategyId && (
        <VersionHistory
          isOpen={!!versionStrategyId}
          strategyId={versionStrategyId}
          onClose={() => setVersionStrategyId(null)}
          onRestored={(code) => {
            setStrategyCode(code)
            setVersionStrategyId(null)
            setActiveTab('backtest')
          }}
        />
      )}
    </>
  )
}
