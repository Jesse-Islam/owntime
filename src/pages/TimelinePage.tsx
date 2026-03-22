import { motion } from 'framer-motion'
import { CalendarDays } from 'lucide-react'

export function TimelinePage() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-full gap-4 px-4 py-16 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <CalendarDays className="w-12 h-12 text-slate-600" />
      <h2 className="text-lg font-semibold text-slate-400">Timeline</h2>
      <p className="text-sm text-slate-600 max-w-xs">
        Drag-and-drop daily timeline with 15-minute snap grid coming in Phase 5.
      </p>
    </motion.div>
  )
}
