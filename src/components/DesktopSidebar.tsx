import { Timer, CalendarDays, BarChart2, Keyboard, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Page } from '../App'

const NAV_ITEMS = [
  { id: 'timer'    as const, icon: Timer,       label: 'Timer'    },
  { id: 'timeline' as const, icon: CalendarDays, label: 'Timeline' },
  { id: 'stats'    as const, icon: BarChart2,    label: 'Stats'    },
]

const SHORTCUTS = [
  { keys: ['Space'],     description: 'Start / Stop' },
  { keys: ['T'],         description: 'Focus tag input' },
  { keys: ['↑', '↓'],   description: 'Navigate days' },
  { keys: ['⌘', 'Z'],   description: 'Undo last action' },
  { keys: ['E'],         description: 'Edit selected entry' },
  { keys: ['Del'],       description: 'Delete selected' },
]

interface DesktopSidebarProps {
  page: Page
  onNavigate: (p: Page) => void
}

export function DesktopSidebar({ page, onNavigate }: DesktopSidebarProps) {
  return (
    <aside
      className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 z-30 bg-slate-800/80 backdrop-blur-md border-r border-slate-700/50"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Clock className="w-4 h-4 text-white" />
        </div>
        <span className="text-base font-semibold text-slate-100 tracking-tight">OwnTime</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
          const active = page === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-current={active ? 'page' : undefined}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                ${active
                  ? 'text-indigo-300 bg-indigo-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }
              `}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 inset-y-1 w-0.5 bg-indigo-400 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          )
        })}
      </nav>

      {/* Keyboard shortcuts legend */}
      <div className="px-4 py-5 border-t border-slate-700/50">
        <div className="flex items-center gap-1.5 mb-3 text-slate-500">
          <Keyboard className="w-3.5 h-3.5" />
          <span className="text-xs font-medium uppercase tracking-wide">Shortcuts</span>
        </div>
        <div className="space-y-1.5">
          {SHORTCUTS.map(({ keys, description }) => (
            <div key={description} className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{description}</span>
              <div className="flex items-center gap-1">
                {keys.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex items-center justify-center min-w-[1.4rem] h-5 px-1 rounded text-[10px] font-mono font-medium bg-slate-700 text-slate-400 border border-slate-600/50"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Version footer */}
      <div className="px-4 pb-4 text-[10px] text-slate-600 font-mono">
        OwnTime v0.1.0 · local-first
      </div>
    </aside>
  )
}
