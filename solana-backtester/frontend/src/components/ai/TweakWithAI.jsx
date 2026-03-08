import { useState } from 'react'
import { Wand2, Check, ChevronDown, ChevronUp, GitCompare } from 'lucide-react'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'
import DiffView from './DiffView'
import { useAppStore } from '../../store/appStore'
import { tweakStrategy } from '../../services/api'
import toast from 'react-hot-toast'

export default function TweakWithAI({ metrics }) {
  const {
    strategyCode, isTweaking, setIsTweaking,
    tweakedCode, setTweakedCode, applyTweakedCode,
    aiWarning, setAiWarning,
  } = useAppStore()

  const [userPrompt, setUserPrompt] = useState('')
  const [showDiff, setShowDiff] = useState(true)
  const [showFull, setShowFull] = useState(false)

  const handleTweak = async () => {
    if (!metrics) { toast.error('Run a backtest first'); return }
    setIsTweaking(true)
    setTweakedCode(null)
    setAiWarning(null)
    try {
      const result = await tweakStrategy(strategyCode, metrics, userPrompt)
      setTweakedCode(result.code)
      if (result.warning) setAiWarning(result.warning)
      setShowDiff(true)
      toast.success('Strategy improved!')
    } catch (e) {
      toast.error(e.message || 'Tweak failed')
    } finally {
      setIsTweaking(false)
    }
  }

  return (
    <div className="card p-4 space-y-3 border-sol-purple/20">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-accent-purple/20 flex items-center justify-center">
          <Wand2 className="w-4 h-4 text-accent-purple" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Tweak with AI</h3>
          <p className="text-[10px] text-gray-500">AI analyzes your results and improves the code</p>
        </div>
      </div>

      {/* Current metrics snapshot */}
      {metrics && (
        <div className="bg-bg-elevated rounded-xl p-3 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Return</span>
            <p className={`font-mono font-bold ${metrics.total_return >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {metrics.total_return >= 0 ? '+' : ''}{metrics.total_return?.toFixed(2)}%
            </p>
          </div>
          <div>
            <span className="text-gray-500">Win Rate</span>
            <p className="font-mono font-bold text-white">{metrics.win_rate?.toFixed(1)}%</p>
          </div>
          <div>
            <span className="text-gray-500">Drawdown</span>
            <p className="font-mono font-bold text-accent-red">{metrics.max_drawdown?.toFixed(2)}%</p>
          </div>
        </div>
      )}

      <textarea
        value={userPrompt}
        onChange={(e) => setUserPrompt(e.target.value)}
        placeholder="Optional: specific goals (e.g. 'add stop-loss at 3%, reduce overtrading')"
        rows={2}
        className="input-field resize-none text-sm"
      />

      {aiWarning && (
        <div className="bg-accent-orange/10 border border-accent-orange/30 rounded-xl p-3">
          <p className="text-xs text-accent-orange">{aiWarning}</p>
        </div>
      )}

      <button
        onClick={handleTweak}
        disabled={isTweaking || !metrics}
        className="btn-primary w-full flex items-center justify-center gap-2 bg-accent-purple/80 hover:bg-accent-purple"
      >
        <Wand2 className="w-4 h-4" />
        {isTweaking ? 'Analyzing & Improving...' : 'Tweak with AI'}
      </button>

      {/* Result */}
      {tweakedCode && (
        <div className="space-y-2 animate-fade-in">
          {/* Toggle: diff vs full code */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDiff(true)}
              className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors touch-manipulation ${
                showDiff
                  ? 'bg-sol-purple/20 border-sol-purple text-sol-purple'
                  : 'bg-bg-elevated border-bg-border text-gray-400'
              }`}
            >
              <GitCompare className="w-3 h-3 inline mr-1" />Diff View
            </button>
            <button
              onClick={() => setShowDiff(false)}
              className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors touch-manipulation ${
                !showDiff
                  ? 'bg-sol-purple/20 border-sol-purple text-sol-purple'
                  : 'bg-bg-elevated border-bg-border text-gray-400'
              }`}
            >
              Full Code
            </button>
          </div>

          {showDiff ? (
            <DiffView originalCode={strategyCode} newCode={tweakedCode} />
          ) : (
            <div className="rounded-xl overflow-hidden border border-sol-purple/30">
              <CodeMirror
                value={tweakedCode}
                extensions={[python()]}
                theme={oneDark}
                maxHeight="300px"
                editable={false}
                basicSetup={{ lineNumbers: true }}
              />
            </div>
          )}

          <button
            onClick={applyTweakedCode}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
          >
            <Check className="w-4 h-4" />
            Apply Improved Strategy
          </button>
        </div>
      )}
    </div>
  )
}
