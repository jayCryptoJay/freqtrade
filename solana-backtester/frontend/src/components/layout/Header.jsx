import { Activity } from 'lucide-react'

export default function Header({ title, subtitle, right }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-bg-primary/95 backdrop-blur-xl border-b border-bg-border safe-top">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sol-purple/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-sol-purple" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">{title || 'SOL Backtester'}</h1>
            {subtitle && <p className="text-xs text-gray-500 leading-tight">{subtitle}</p>}
          </div>
        </div>
        {right && <div className="flex items-center gap-2">{right}</div>}
      </div>
    </header>
  )
}
