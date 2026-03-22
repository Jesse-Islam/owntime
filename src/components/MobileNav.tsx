import { Timer, CalendarDays, BarChart2 } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Page } from '../App'

const NAV_ITEMS = [
  { id: 'timer'    as const, icon: Timer,       label: 'Timer'    },
  { id: 'timeline' as const, icon: CalendarDays, label: 'Timeline' },
  { id: 'stats'    as const, icon: BarChart2,    label: 'Stats'    },
]

interface MobileNavProps {
  page: Page
  onNavigate: (p: Page) => void
}

export function MobileNav({ page, onNavigate }: MobileNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-800/95 backdrop-blur-sm border-t border-slate-700/50"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch safe-bottom">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
          const active = page === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-current={active ? 'page' : undefined}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] relative transition-colors focus-visible:outline-none"
            >
              {active && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute inset-x-3 top-0 h-0.5 bg-indigo-400 rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon
                className={`w-5 h-5 transition-colors ${active ? 'text-indigo-400' : 'text-slate-500'}`}
              />
              <span className={`text-[10px] font-medium transition-colors ${active ? 'text-indigo-400' : 'text-slate-500'}`}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
