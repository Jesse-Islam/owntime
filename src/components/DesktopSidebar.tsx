import { Timer, CalendarDays, BarChart2, Keyboard, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { ThemeSelector } from './ThemeSelector'
import type { Page } from '../App'

const NAV_ITEMS = [
  { id: 'timer'    as const, icon: Timer,       label: 'Timer'    },
  { id: 'timeline' as const, icon: CalendarDays, label: 'Timeline' },
  { id: 'stats'    as const, icon: BarChart2,    label: 'Stats'    },
]

const SHORTCUTS = [
  { keys: ['Space'], description: 'Start / Stop' },
  { keys: ['← →'],  description: 'Navigate days' },
  { keys: ['T'],     description: 'Focus tags' },
]

interface DesktopSidebarProps {
  page: Page
  onNavigate: (p: Page) => void
}

export function DesktopSidebar({ page, onNavigate }: DesktopSidebarProps) {
  return (
    <aside
      className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 z-30 backdrop-blur-md"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--ot-surface) 92%, transparent)',
        borderRight: '1px solid var(--ot-border)',
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
          style={{ backgroundColor: 'var(--ot-accent)', boxShadow: '0 4px 12px var(--ot-accent)40' }}
        >
          <Clock className="w-4 h-4 text-white" />
        </div>
        <span className="text-base font-semibold tracking-tight ot-text">OwnTime</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
          const active = page === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-current={active ? 'page' : undefined}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative focus-visible:outline-none focus-visible:ring-2"
              style={{
                color: active ? 'var(--ot-accent-text)' : 'var(--ot-muted)',
                backgroundColor: active ? 'var(--ot-accent-bg)' : undefined,
                '--tw-ring-color': 'var(--ot-accent)',
              } as React.CSSProperties}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'var(--ot-surface2)' }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = '' }}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 inset-y-1.5 w-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--ot-accent)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          )
        })}
      </nav>

      {/* Shortcuts */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--ot-border)' }}>
        <div className="flex items-center gap-1.5 mb-2.5 ot-faint">
          <Keyboard className="w-3.5 h-3.5" />
          <span className="text-[10px] font-medium uppercase tracking-wide">Shortcuts</span>
        </div>
        <div className="space-y-1.5">
          {SHORTCUTS.map(({ keys, description }) => (
            <div key={description} className="flex items-center justify-between">
              <span className="text-xs ot-faint">{description}</span>
              <div className="flex items-center gap-1">
                {keys.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex items-center justify-center min-w-[1.4rem] h-5 px-1 rounded text-[10px] font-mono font-medium border"
                    style={{ backgroundColor: 'var(--ot-surface2)', color: 'var(--ot-muted)', borderColor: 'var(--ot-border)' }}
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Theme selector */}
      <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--ot-border)', paddingTop: '1rem' }}>
        <ThemeSelector />
      </div>

      <div className="px-4 pb-4 text-[10px] ot-faint font-mono">
        OwnTime v0.1.0 · local-first
      </div>
    </aside>
  )
}
