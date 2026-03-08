import { useAppStore } from '../../store/appStore'
import { Zap, DollarSign, Clock, TrendingUp } from 'lucide-react'

export default function BacktestConfig() {
  const { leverage, setLeverage, feeRate, setFeeRate, initialCapital, setInitialCapital, daysBack, setDaysBack } = useAppStore()

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Leverage */}
      <div className="card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="w-3.5 h-3.5 text-accent-orange" />
          <span className="text-xs text-gray-500 uppercase tracking-wider">Leverage</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1} max={25} step={1}
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="flex-1 h-1.5 bg-bg-elevated rounded-full appearance-none accent-sol-purple cursor-pointer"
          />
          <span className="text-sm font-bold text-white font-mono w-10 text-right">{leverage}x</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-600">1x</span>
          <span className="text-[10px] text-gray-600">25x</span>
        </div>
      </div>

      {/* Fee Rate */}
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
          <option value={0.0001}>0.01% (Maker)</option>
          <option value={0.001}>0.1% (Standard)</option>
          <option value={0.002}>0.2% (Taker)</option>
          <option value={0.005}>0.5% (High)</option>
        </select>
      </div>

      {/* Capital */}
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

      {/* Days Back */}
      <div className="card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Clock className="w-3.5 h-3.5 text-accent-purple" />
          <span className="text-xs text-gray-500 uppercase tracking-wider">History</span>
        </div>
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
    </div>
  )
}
