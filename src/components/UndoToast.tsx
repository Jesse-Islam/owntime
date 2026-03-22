/**
 * UndoToast — a fixed bottom toast with an Undo button.
 * Call showUndo(message, callback) from any component via useUndo().
 * Auto-dismisses after TOAST_MS milliseconds.
 */
import { createContext, useContext, useRef, useState, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Undo2 } from 'lucide-react'

const TOAST_MS = 5000

interface UndoState {
  id: number
  message: string
  onUndo: () => void
}

interface UndoContextValue {
  showUndo: (message: string, onUndo: () => void) => void
}

const UndoContext = createContext<UndoContextValue>({ showUndo: () => {} })

export function useUndo() {
  return useContext(UndoContext)
}

export function UndoToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<UndoState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const counterRef = useRef(0)

  const dismiss = useCallback(() => setToast(null), [])

  const showUndo = useCallback((message: string, onUndo: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const id = ++counterRef.current
    setToast({ id, message, onUndo })
    timerRef.current = setTimeout(() => {
      setToast((prev) => prev?.id === id ? null : prev)
    }, TOAST_MS)
  }, [])

  const handleUndo = useCallback(() => {
    if (!toast) return
    toast.onUndo()
    dismiss()
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [toast, dismiss])

  return (
    <UndoContext.Provider value={{ showUndo }}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="fixed bottom-[72px] md:bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm"
            style={{
              backgroundColor: 'var(--ot-surface)',
              borderColor: 'var(--ot-border)',
              color: 'var(--ot-text)',
              minWidth: 240,
            }}
          >
            <span className="flex-1 ot-muted">{toast.message}</span>
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ backgroundColor: 'var(--ot-accent-bg)', color: 'var(--ot-accent-text)' }}
            >
              <Undo2 className="w-3.5 h-3.5" />
              Undo
            </button>
            <button
              onClick={dismiss}
              className="text-xs ot-faint hover:ot-muted transition-colors px-1"
              aria-label="Dismiss"
            >
              ✕
            </button>
            {/* Progress bar */}
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 rounded-b-xl"
              style={{ backgroundColor: 'var(--ot-accent)' }}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: TOAST_MS / 1000, ease: 'linear' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </UndoContext.Provider>
  )
}
