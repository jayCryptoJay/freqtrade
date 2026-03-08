import { useState } from 'react'
import { Settings, Key, Info, ChevronRight, Moon, DollarSign, Zap } from 'lucide-react'
import Header from '../components/layout/Header'
import { useAppStore } from '../store/appStore'
import toast from 'react-hot-toast'

function SettingRow({ icon: Icon, title, description, right, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 rounded-xl bg-bg-elevated border border-bg-border text-left transition-all touch-manipulation ${onClick ? 'hover:border-gray-500 active:scale-[0.99]' : 'cursor-default'}`}
    >
      <div className="w-9 h-9 rounded-xl bg-bg-card flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{description}</p>}
      </div>
      {right || (onClick && <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />)}
    </button>
  )
}

export default function SettingsPage() {
  const { settings, updateSettings, setLeverage, setFeeRate, setInitialCapital } = useAppStore()
  const [apiKey, setApiKey] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)

  const handleSaveKey = () => {
    // In a real app, this would securely store the key
    // For demo: just show a toast
    toast.success('API key will be used for AI generation (restart backend to apply)')
    setShowKeyInput(false)
  }

  return (
    <>
      <Header title="Settings" subtitle="Configure your backtester" />

      <div className="page-container space-y-6">
        {/* General */}
        <section>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 px-1">General</p>
          <div className="space-y-2">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-sol-green" />
                  <p className="text-sm font-medium text-white">Default Capital</p>
                </div>
              </div>
              <select
                value={settings.defaultCapital}
                onChange={(e) => updateSettings({ defaultCapital: Number(e.target.value) })}
                className="w-full bg-bg-elevated border border-bg-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-sol-purple/60"
              >
                <option value={1000}>$1,000</option>
                <option value={5000}>$5,000</option>
                <option value={10000}>$10,000</option>
                <option value={50000}>$50,000</option>
                <option value={100000}>$100,000</option>
              </select>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent-orange" />
                  <p className="text-sm font-medium text-white">Default Leverage</p>
                </div>
                <span className="text-sm font-bold font-mono text-white">{settings.defaultLeverage}x</span>
              </div>
              <input
                type="range"
                min={1} max={25} step={1}
                value={settings.defaultLeverage}
                onChange={(e) => updateSettings({ defaultLeverage: Number(e.target.value) })}
                className="w-full h-2 bg-bg-elevated rounded-full appearance-none accent-sol-purple cursor-pointer"
              />
            </div>

            <div className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-accent-blue" />
                <div>
                  <p className="text-sm font-medium text-white">Trade Markers</p>
                  <p className="text-xs text-gray-500">Show on equity chart</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showTradeMarkers}
                  onChange={(e) => updateSettings({ showTradeMarkers: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-bg-elevated peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sol-purple border border-bg-border" />
              </label>
            </div>
          </div>
        </section>

        {/* AI Configuration */}
        <section>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 px-1">AI Configuration</p>
          <div className="space-y-2">
            <SettingRow
              icon={Key}
              title="Anthropic API Key"
              description="Required for AI strategy generation and tweaking. Set in backend/.env file."
              onClick={() => setShowKeyInput((v) => !v)}
            />
            {showKeyInput && (
              <div className="card p-4 space-y-3 animate-fade-in">
                <p className="text-xs text-gray-500">
                  For production use, set <code className="text-gray-300 bg-bg-elevated px-1 rounded">ANTHROPIC_API_KEY</code> in your backend <code className="text-gray-300 bg-bg-elevated px-1 rounded">.env</code> file and restart the server.
                </p>
                <div className="bg-bg-elevated rounded-xl p-3 font-mono text-xs text-gray-400 space-y-1">
                  <p className="text-gray-500"># backend/.env</p>
                  <p>ANTHROPIC_API_KEY=sk-ant-...</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* About */}
        <section>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 px-1">About</p>
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sol-purple/20 flex items-center justify-center">
                <Info className="w-5 h-5 text-sol-purple" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">SOL Backtester v1.0</p>
                <p className="text-xs text-gray-500">Solana strategy testing platform</p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Data Source</span>
                <span className="text-gray-300">Binance / Bybit Public API</span>
              </div>
              <div className="flex justify-between">
                <span>AI Model</span>
                <span className="text-gray-300">Claude Sonnet 4.6</span>
              </div>
              <div className="flex justify-between">
                <span>Backend</span>
                <span className="text-gray-300">FastAPI + SQLite</span>
              </div>
              <div className="flex justify-between">
                <span>Frontend</span>
                <span className="text-gray-300">React + Tailwind CSS</span>
              </div>
            </div>
            <div className="bg-bg-elevated rounded-xl p-3">
              <p className="text-xs text-accent-orange font-medium mb-1">⚠ Disclaimer</p>
              <p className="text-xs text-gray-500">
                Past performance does not guarantee future results. This tool is for educational purposes only.
                Always conduct your own research before trading.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
