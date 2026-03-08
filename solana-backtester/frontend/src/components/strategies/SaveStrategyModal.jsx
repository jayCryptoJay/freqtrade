import { useState } from 'react'
import { Save, Tag } from 'lucide-react'
import Modal from '../common/Modal'
import { createStrategy } from '../../services/api'
import { useAppStore } from '../../store/appStore'
import toast from 'react-hot-toast'

export default function SaveStrategyModal({ isOpen, onClose, onSaved }) {
  const { strategyCode, currentResults } = useAppStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Enter a strategy name')
      return
    }
    setSaving(true)
    try {
      await createStrategy({
        name: name.trim(),
        description: description.trim() || null,
        code: strategyCode,
        tags: tags.trim() || null,
      })
      toast.success('Strategy saved to library!')
      onSaved?.()
      onClose()
      setName('')
      setDescription('')
      setTags('')
    } catch (e) {
      toast.error(e.message || 'Failed to save strategy')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save Strategy">
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Strategy Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., EMA Crossover v2"
            className="input-field"
            maxLength={200}
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the strategy logic..."
            rows={3}
            className="input-field resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">
            <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> Tags (comma-separated)</span>
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="trend, ema, momentum"
            className="input-field"
          />
        </div>

        {/* Metrics preview if available */}
        {currentResults?.metrics && (
          <div className="bg-bg-elevated rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-2">Will save with latest backtest results:</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-gray-500">Return</p>
                <p className={`font-mono font-bold ${currentResults.metrics.total_return >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {currentResults.metrics.total_return >= 0 ? '+' : ''}{currentResults.metrics.total_return?.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-gray-500">Sharpe</p>
                <p className="font-mono font-bold text-white">{currentResults.metrics.sharpe_ratio?.toFixed(3)}</p>
              </div>
              <div>
                <p className="text-gray-500">Win Rate</p>
                <p className="font-mono font-bold text-white">{currentResults.metrics.win_rate?.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Strategy'}
        </button>
      </div>
    </Modal>
  )
}
