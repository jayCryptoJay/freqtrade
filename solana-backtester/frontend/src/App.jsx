import { useAppStore } from './store/appStore'
import BottomNav from './components/layout/BottomNav'
import BacktestPage from './pages/BacktestPage'
import ResultsPage from './pages/ResultsPage'
import StrategiesPage from './pages/StrategiesPage'
import SettingsPage from './pages/SettingsPage'

const PAGES = {
  backtest: BacktestPage,
  results: ResultsPage,
  strategies: StrategiesPage,
  settings: SettingsPage,
}

export default function App() {
  const { activeTab } = useAppStore()
  const Page = PAGES[activeTab] || BacktestPage

  return (
    <div className="min-h-dvh bg-bg-primary">
      <main className="animate-fade-in">
        <Page />
      </main>
      <BottomNav />
    </div>
  )
}
