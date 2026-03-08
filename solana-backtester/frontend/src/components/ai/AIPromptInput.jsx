import { useState } from 'react'
import { Sparkles, ChevronDown, ChevronUp, Check, Copy } from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'
import { useAppStore } from '../../store/appStore'
import { generateStrategy } from '../../services/api'
import toast from 'react-hot-toast'

const EXAMPLE_PROMPTS = [
  "Buy when RSI drops below 25, sell when RSI crosses above 70",
  "EMA 20/50 crossover with volume confirmation above 20-period average",
  "Long when price breaks above Bollinger Band upper, short when it breaks below",
]

export default function AIPromptInput() {
  const { aiPrompt, setAiPrompt, isGenerating, setIsGenerating, setGeneratedCode, generatedCode, applyGeneratedCode, aiWarning, setAiWarning } = useAppStore()
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Enter a strategy description')
      return
    }
    setIsGenerating(true)
    setGeneratedCode(null)
    setAiWarning(null)
    try {
      const result = await generateStrategy(aiPrompt)
      setGeneratedCode(result.code)
      if (result.warning) setAiWarning(result.warning)
      setExpanded(true)
      toast.success('Strategy generated!')
    } catch (e) {
      toast.error(e.message || 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-sol-purple/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-sol-purple" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">AI Strategy Generator</h3>
          <p className="text-[10px] text-gray-500">Describe your idea in plain English</p>
        </div>
      </div>

      {/* Example prompts */}
      <div className="space-y-1">
        {EXAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => setAiPrompt(p)}
            className="w-full text-left text-xs text-gray-500 hover:text-gray-300 py-1 px-2 rounded-lg hover:bg-bg-elevated transition-colors touch-manipulation truncate"
          >
            <span className="text-sol-purple mr-1">→</span>{p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Describe your trading strategy..."
          rows={3}
          className="input-field resize-none text-sm"
          onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleGenerate() }}
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={isGenerating || !aiPrompt.trim()}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        {isGenerating ? 'Generating...' : 'Generate Strategy'}
      </button>

      {/* Warning banner */}
      {aiWarning && (
        <div className="bg-accent-orange/10 border border-accent-orange/30 rounded-xl p-3">
          <p className="text-xs text-accent-orange">{aiWarning}</p>
        </div>
      )}

      {/* Generated code preview */}
      {generatedCode && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Generated Code</span>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-gray-500 flex items-center gap-1 touch-manipulation"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {expanded && (
            <div className="rounded-xl overflow-hidden border border-bg-border mb-2">
              <CodeMirror
                value={generatedCode}
                extensions={[python()]}
                theme={oneDark}
                maxHeight="300px"
                editable={false}
                basicSetup={{ lineNumbers: true }}
              />
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleCopy} className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm">
              {copied ? <Check className="w-4 h-4 text-accent-green" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={applyGeneratedCode} className="btn-primary flex-1 text-sm">
              Use This Strategy →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
