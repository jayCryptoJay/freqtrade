import { useState, useEffect, useCallback } from 'react'
import { History, RotateCcw, Code2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import Modal from '../common/Modal'
import { listVersions, restoreVersion } from '../../services/api'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CodePreview({ code }) {
  if (!code) return null
  // Show at most 12 lines in the collapsed preview
  const lines = code.split('\n').slice(0, 12)
  const truncated = code.split('\n').length > 12
  return (
    <pre className="text-[11px] font-mono leading-relaxed text-gray-400 whitespace-pre overflow-x-auto scrollbar-thin p-3 bg-bg-primary rounded-lg border border-bg-border">
      {lines.join('\n')}
      {truncated && <span className="text-gray-600">{'\n'}…</span>}
    </pre>
  )
}

// ── Version row ───────────────────────────────────────────────────────────────

function VersionRow({ version, strategyId, onRestored, isLatest }) {
  const [expanded, setExpanded] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const handleRestore = async () => {
    setRestoring(true)
    try {
      const result = await restoreVersion(strategyId, version.id)
      toast.success(`Restored to version ${version.version_number}`)
      onRestored?.(result.code ?? version.code)
    } catch (e) {
      toast.error(e.message || 'Failed to restore version')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div
      className={clsx(
        'rounded-xl border transition-colors duration-200',
        isLatest
          ? 'border-sol-purple/40 bg-sol-purple/5'
          : 'border-bg-border bg-bg-elevated'
      )}
    >
      {/* Row header */}
      <div className="flex items-center gap-3 p-3">
        {/* Version badge */}
        <div
          className={clsx(
            'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold font-mono',
            isLatest
              ? 'bg-sol-purple/20 text-sol-purple'
              : 'bg-bg-card text-gray-400'
          )}
        >
          v{version.version_number}
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">
              Version {version.version_number}
            </span>
            {isLatest && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-sol-purple/20 text-sol-purple border border-sol-purple/30">
                Latest
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{formatDate(version.created_at)}</p>
          {version.message && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{version.message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Code preview toggle */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className={clsx(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 touch-manipulation',
              expanded
                ? 'bg-bg-border text-white'
                : 'text-gray-500 hover:text-gray-300 hover:bg-bg-border'
            )}
            title="Toggle code preview"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
          </button>

          {/* Restore button */}
          <button
            onClick={handleRestore}
            disabled={restoring || isLatest}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 touch-manipulation',
              isLatest
                ? 'bg-bg-card text-gray-600 cursor-default'
                : restoring
                ? 'bg-sol-purple/20 text-sol-purple/60 cursor-not-allowed'
                : 'bg-sol-purple/10 hover:bg-sol-purple/20 text-sol-purple border border-sol-purple/30 active:scale-95'
            )}
            title={isLatest ? 'Already the latest version' : 'Restore this version'}
          >
            <RotateCcw className={clsx('w-3 h-3', restoring && 'animate-spin')} />
            {restoring ? 'Restoring…' : isLatest ? 'Current' : 'Restore'}
          </button>
        </div>
      </div>

      {/* Expandable code preview */}
      {expanded && (
        <div className="px-3 pb-3 animate-fade-in">
          <div className="flex items-center gap-1.5 mb-2">
            <Code2 className="w-3 h-3 text-gray-500" />
            <span className="text-[10px] uppercase tracking-wider text-gray-500">Code Preview</span>
          </div>
          <CodePreview code={version.code} />
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function VersionHistory({ isOpen, onClose, strategyId, onRestored }) {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchVersions = useCallback(async () => {
    if (!strategyId) return
    setLoading(true)
    setError(null)
    try {
      const data = await listVersions(strategyId)
      // Sort descending by version_number so newest is first
      const sorted = [...data].sort((a, b) => b.version_number - a.version_number)
      setVersions(sorted)
    } catch (e) {
      setError(e.message || 'Failed to load version history')
    } finally {
      setLoading(false)
    }
  }, [strategyId])

  // Fetch whenever the modal opens (or strategyId changes while open)
  useEffect(() => {
    if (isOpen) {
      fetchVersions()
    } else {
      // Reset when closed so stale data doesn't flash on next open
      setVersions([])
      setError(null)
    }
  }, [isOpen, fetchVersions])

  const handleRestored = (code) => {
    onRestored?.(code)
    onClose()
  }

  const latestVersionNumber = versions.length > 0 ? versions[0].version_number : null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Version History" size="lg">
      <div className="space-y-4">
        {/* Header info row */}
        <div className="flex items-center gap-2 px-1">
          <History className="w-4 h-4 text-sol-purple shrink-0" />
          <p className="text-xs text-gray-500">
            {loading
              ? 'Loading versions…'
              : error
              ? 'Could not load history.'
              : versions.length === 0
              ? 'No saved versions yet.'
              : `${versions.length} saved version${versions.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-accent-red/10 border border-accent-red/30 rounded-xl p-3 flex items-start gap-2">
            <span className="text-accent-red text-xs flex-1">{error}</span>
            <button
              onClick={fetchVersions}
              className="text-xs text-accent-red underline underline-offset-2 hover:no-underline touch-manipulation shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && versions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center">
              <History className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">No versions saved</p>
              <p className="text-xs text-gray-600 mt-1">
                Versions are created automatically each time you save a strategy.
              </p>
            </div>
          </div>
        )}

        {/* Version list */}
        {!loading && versions.length > 0 && (
          <div className="space-y-2">
            {versions.map((version) => (
              <VersionRow
                key={version.id}
                version={version}
                strategyId={strategyId}
                onRestored={handleRestored}
                isLatest={version.version_number === latestVersionNumber}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
