import { FlaskConical, BookOpen, BarChart2, Settings } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import clsx from 'clsx'

const tabs = [
  { id: 'backtest', label: 'Backtest', icon: FlaskConical },
  { id: 'strategies', label: 'Library', icon: BookOpen },
  { id: 'results', label: 'Results', icon: BarChart2 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function BottomNav() {
  const { activeTab, setActiveTab } = useAppStore()

  return (
    <nav className="tab-bar">
      <div className="max-w-2xl mx-auto flex">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                'relative flex-1 flex flex-col items-center gap-1 py-2.5 px-2 transition-all duration-200 touch-manipulation min-h-[56px] justify-center',
                active ? 'text-sol-purple' : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {/* Active top-edge indicator — positioned relative to this button */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-sol-purple rounded-full" />
              )}
              <Icon
                className={clsx('w-5 h-5 transition-all duration-200', active && 'scale-110')}
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span className={clsx('text-[10px] font-medium', active ? 'text-sol-purple' : 'text-gray-500')}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
