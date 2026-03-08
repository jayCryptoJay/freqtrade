import { useAppStore } from '../../store/appStore'
import { Zap, DollarSign, Clock, TrendingUp, ShieldAlert, Target, Globe } from 'lucide-react'

const SYMBOLS = ['SOLUSDT', 'BTCUSDT', 'ETHUSDT', 'AVAXUSDT', 'MATICUSDT']

export default function BacktestConfig() {
  const {
    symbol, setSymbol,
    leverage, setLeverage,
    feeRate, setFeeRate,
    initialCapital, setInitialCapital,
    daysBack, setDaysBack,
    startDate, setStartDate,
    endDate, setEndDate,
    stopLossPct, setStopLossPct,
    takeProfitPct, setTakeProfitPct,
  } = useAppStore()

  return (
    <div className="space-y-3">
      {/* Row 1: Symbol + Leverage */}
      <div className="grid grid-cols-2 gap-3">
        {/* Symbol */}
        <div className="card p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Globe className="w-3.5 h-3.5 text-sol-blue" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Symbol</span>
          </div>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full bg-bg-elevated border border-bg-border rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-sol-purple/60"
          >
            {SYMBOLS.map((s) => <option key={s} value={s}>{s.replace('USDT', '/USDT')}</option>)}
          </select>
        </div>

        {/* Leverage */}
        <div className="card p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3.5 h-3.5 text-accent-orange" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Leverage</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range" min={1} max={25} step={1}
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="flex-1 h-1.5 bg-bg-elevated rounded-full appearance-none accent-sol-purple cursor-pointer"
            />
            <span className="text-sm font-bold text-white font-mono w-10 text-right">{leverage}x</span>
          </div>
        </div>
      </div>

      {/* Row 2: Fee Rate + Capital */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-accent-blue" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Fee Rate</span>
          </div>
          <select
            value={feeRate}
            onChange={(e) => setFeeRate(Number(e.target.value))}
            className="w-full bg-bg-elevated border border-bg-border rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-sol-purple/60"
          >
            <option value={0.0001}>0.01% Maker</option>
            <option value={0.001}>0.1% Standard</option>
            <option value={0.002}>0.2% Taker</option>
            <option value={0.005}>0.5% High</option>
          </select>
        </div>

        <div className="card p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-sol-green" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Capital</span>
          </div>
          <select
            value={initialCapital}
            onChange={(e) => setInitialCapital(Number(e.target.value))}
            className="w-full bg-bg-elevated border border-bg-border rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-sol-purple/60"
          >
            <option value={1000}>$1,000</option>
            <option value={5000}>$5,000</option>
            <option value={10000}>$10,000</option>
            <option value={50000}>$50,000</option>
            <option value={100000}>$100,000</option>
          </select>
        </div>
      </div>

      {/* Row 3: History / Date range */}
      <div className="card p-3 space-y-2">
        <div className="flex items-center gap-1.5 mb-1">
          <Clock className="w-3.5 h-3.5 text-accent-purple" />
          <span className="text-xs text-gray-500 uppercase tracking-wider">Data Range</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-600 mb-1 block">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); if (e.target.value) setDaysBack(180) }}
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-sol-purple/60 [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-600 mb-1 block">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-sol-purple/60 [color-scheme:dark]"
            />
          </div>
        </div>
        {!startDate && (
          <div>
            <label className="text-[10px] text-gray-600 mb-1 block">Or use last N days</label>
            <select
              value={daysBack}
              onChange={(e) => setDaysBack(Number(e.target.value))}
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-sol-purple/60"
            >
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year</option>
              <option value={730}>2 years</option>
            </select>
          </div>
        )}
        {startDate && (
          <button
            onClick={() => { setStartDate(''); setEndDate('') }}
            className="text-xs text-accent-red hover:text-red-400 transition-colors touch-manipulation"
          >
            ✕ Clear dates (use days_back)
          </button>
        )}
      </div>

      {/* Row 4: Stop-Loss / Take-Profit */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldAlert className="w-3.5 h-3.5 text-accent-red" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Stop Loss</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.5"
              min="0.1"
              max="50"
              value={stopLossPct}
              onChange={(e) => setStopLossPct(e.target.value)}
              placeholder="e.g. 5"
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-accent-red/60 placeholder-gray-600"
            />
            <span className="text-xs text-gray-500 ml-1">%</span>
          </div>
          <p className="text-[10px] text-gray-600 mt-1">Leave blank to disable</p>
        </div>

        <div className="card p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-3.5 h-3.5 text-accent-green" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Take Profit</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.5"
              min="0.1"
              max="500"
              value={takeProfitPct}
              onChange={(e) => setTakeProfitPct(e.target.value)}
              placeholder="e.g. 10"
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-accent-green/60 placeholder-gray-600"
            />
            <span className="text-xs text-gray-500 ml-1">%</span>
          </div>
          <p className="text-[10px] text-gray-600 mt-1">Leave blank to disable</p>
        </div>
      </div>
    </div>
  )
}
