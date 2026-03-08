import clsx from 'clsx'

export function LoadingSpinner({ size = 'md', className }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div
      className={clsx(
        'border-2 border-bg-border border-t-sol-purple rounded-full animate-spin',
        sizes[size],
        className
      )}
    />
  )
}

export function LoadingOverlay({ message = 'Running backtest...' }) {
  return (
    <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-bg-border border-t-sol-purple rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-bg-border border-b-sol-green rounded-full animate-spin animation-delay-150" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-white font-semibold">{message}</p>
        <p className="text-xs text-gray-500 mt-1">Fetching data & simulating trades...</p>
      </div>
    </div>
  )
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card p-4 space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={clsx('h-4 skeleton rounded', i === 0 ? 'w-3/4' : i % 2 === 0 ? 'w-full' : 'w-1/2')} />
      ))}
    </div>
  )
}
