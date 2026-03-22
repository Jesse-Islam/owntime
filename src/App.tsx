import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ThemeProvider } from './components/ThemeProvider'
import { TimerProvider } from './components/TimerProvider'
import { ActionBar } from './components/ActionBar'
import { MobileNav } from './components/MobileNav'
import { DesktopSidebar } from './components/DesktopSidebar'
import { TimerPage } from './pages/TimerPage'
import { TimelinePage } from './pages/TimelinePage'
import { StatsPage } from './pages/StatsPage'

export type Page = 'timer' | 'timeline' | 'stats'

// Timeline needs its own inner scroll; other pages are normal scrolling content.
const FULL_HEIGHT_PAGES: Page[] = ['timeline']

export default function App() {
  const [page, setPage] = useState<Page>('timer')
  const isFullHeight = FULL_HEIGHT_PAGES.includes(page)

  const PageComponent = {
    timer: TimerPage,
    timeline: TimelinePage,
    stats: StatsPage,
  }[page]

  return (
    <ThemeProvider>
      <TimerProvider>
        <DesktopSidebar page={page} onNavigate={setPage} />
        <ActionBar />

        {/*
          main is flex-col, overflow-hidden.
          The timeline page manages its own internal scroll.
          Other pages scroll normally via their own overflow-y-auto wrappers.
        */}
        <main
          className="flex-1 flex flex-col overflow-hidden pt-[53px] pb-[65px] md:pl-64 md:pb-0"
          style={{ backgroundColor: 'var(--ot-bg)' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className={isFullHeight ? 'flex-1 flex flex-col overflow-hidden' : 'flex-1 overflow-y-auto'}
            >
              <PageComponent />
            </motion.div>
          </AnimatePresence>
        </main>

        <MobileNav page={page} onNavigate={setPage} />
      </TimerProvider>
    </ThemeProvider>
  )
}
