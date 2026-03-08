import { useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'
import { ChevronDown, ChevronUp, Layers } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { getTemplates } from '../../services/api'
import toast from 'react-hot-toast'

export default function StrategyEditor() {
  const { strategyCode, setStrategyCode } = useAppStore()
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  const handleShowTemplates = async () => {
    if (!showTemplates && templates.length === 0) {
      setLoadingTemplates(true)
      try {
        const data = await getTemplates()
        setTemplates(data)
      } catch {
        toast.error('Failed to load templates')
      } finally {
        setLoadingTemplates(false)
      }
    }
    setShowTemplates((v) => !v)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-gray-500 uppercase tracking-wider">Strategy Code</label>
        <button
          onClick={handleShowTemplates}
          className="flex items-center gap-1 text-xs text-sol-purple hover:text-purple-400 transition-colors touch-manipulation px-2 py-1"
        >
          <Layers className="w-3.5 h-3.5" />
          Templates
          {showTemplates ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Template Picker */}
      {showTemplates && (
        <div className="mb-3 space-y-2 animate-fade-in">
          {loadingTemplates ? (
            <div className="card p-3 text-center text-sm text-gray-500">Loading templates...</div>
          ) : (
            templates.map((tmpl) => (
              <button
                key={tmpl.key}
                onClick={() => {
                  setStrategyCode(tmpl.code)
                  setShowTemplates(false)
                  toast.success(`Loaded: ${tmpl.name}`)
                }}
                className="w-full card p-3 text-left hover:border-sol-purple/40 transition-all duration-200 touch-manipulation"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{tmpl.name}</span>
                  <div className="flex gap-1">
                    {tmpl.tags?.slice(0, 2).map((t) => (
                      <span key={t} className="tag">{t}</span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{tmpl.description}</p>
              </button>
            ))
          )}
        </div>
      )}

      {/* Code Editor */}
      <div className="rounded-xl overflow-hidden border border-bg-border">
        <CodeMirror
          value={strategyCode}
          onChange={setStrategyCode}
          extensions={[python()]}
          theme={oneDark}
          minHeight="240px"
          maxHeight="400px"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            syntaxHighlighting: true,
            autocompletion: true,
            foldGutter: true,
          }}
        />
      </div>
      <p className="text-[10px] text-gray-600 mt-1 px-1">
        Function must be named <code className="text-gray-400">strategy(df)</code> and return a Series of -1, 0, or 1 signals.
      </p>
    </div>
  )
}
