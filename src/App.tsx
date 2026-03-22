import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TimerProvider } from './components/TimerProvider'
import { ActionBar } from './components/ActionBar'
import { MobileNav } from './components/MobileNav'
import { DesktopSidebar } from './components/DesktopSidebar'
import { TimerPage } from './pages/TimerPage'
import { TimelinePage } from './pages/TimelinePage'
import { StatsPage } from './pages/StatsPage'

export type Page = 'timer' | 'timeline' | 'stats'

const PAGE_COMPONENTS: Record<Page, React.ComponentType> = {
  timer:    TimerPage,
  timeline: TimelinePage,
  stats:    StatsPage,
}

export default function App() {
  const [page, setPage] = useState<Page>('timer')
  const PageComponent = PAGE_COMPONENTS[page]

  return (
    <TimerProvider>
      {/* Desktop sidebar (md+) */}
      <DesktopSidebar page={page} onNavigate={setPage} />

      {/* Global action bar */}
      <ActionBar />

      {/* Main scrollable content area */}
      {/* Desktop: offset for sidebar (left-64) + action bar (top-[57px]) */}
      {/* Mobile: offset for action bar (top-[57px]) + bottom nav (bottom-[65px]) */}
      <main
        className="
          flex-1 overflow-y-auto
          pt-[57px] pb-[65px]
          md:pl-64 md:pb-0
        "
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
            className="min-h-full"
          >
            <PageComponent />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav page={page} onNavigate={setPage} />
    </TimerProvider>
  )
}
