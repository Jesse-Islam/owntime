import { useState } from 'react'
import { Timer, BarChart2, CalendarDays } from 'lucide-react'

type Page = 'timer' | 'timeline' | 'stats'

function App() {
  const [page, setPage] = useState<Page>('timer')

  return (
    <div className="flex flex-col h-full bg-[#0f172a] text-slate-200">
      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto">
          {page === 'timer' && (
            <div className="flex flex-col items-center justify-center h-full min-h-64 gap-4">
              <h1 className="text-3xl font-bold tracking-tight text-slate-100">OwnTime</h1>
              <p className="text-slate-400 text-sm">Privacy-first local time tracker</p>
              <div className="text-6xl font-mono font-light text-slate-100 tabular-nums">
                00:00:00
              </div>
              <button className="mt-4 w-20 h-20 rounded-full bg-indigo-500 hover:bg-indigo-400 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Timer className="w-8 h-8 text-white" />
              </button>
            </div>
          )}
          {page === 'timeline' && (
            <div className="text-slate-400 text-center py-16">Timeline coming in Phase 5</div>
          )}
          {page === 'stats' && (
            <div className="text-slate-400 text-center py-16">Stats coming soon</div>
          )}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden border-t border-slate-700/50 bg-[#1e293b] safe-bottom">
        <div className="flex items-center justify-around">
          {(
            [
              { id: 'timer', icon: Timer, label: 'Timer' },
              { id: 'timeline', icon: CalendarDays, label: 'Timeline' },
              { id: 'stats', icon: BarChart2, label: 'Stats' },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                page === id ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default App
