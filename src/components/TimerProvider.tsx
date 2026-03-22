import { useReducer, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { EntriesRepository } from '../db/EntriesRepository'
import { TimerContext, timerReducer, initialTimerState } from '../store/timerStore'
import { elapsedMs } from '../engine/timeEngine'

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(timerReducer, initialTimerState)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Boot: load any already-running entry from DB
  useEffect(() => {
    dispatch({ type: 'SET_LOADING', loading: true })
    EntriesRepository.getRunning().then((entry) => {
      dispatch({ type: 'SET_RUNNING', entry })
    })
  }, [])

  // Tick every second while an entry is running
  useEffect(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    if (state.runningEntry) {
      const { startedAt } = state.runningEntry
      tickRef.current = setInterval(() => {
        dispatch({ type: 'TICK', elapsedMs: elapsedMs(startedAt, null) })
      }, 1_000)
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [state.runningEntry])

  const startTimer = useCallback(async (tagIds: string[] = [], notes = '') => {
    // Stop any currently running entry first (safety guard)
    if (state.runningEntry) {
      await EntriesRepository.stop(state.runningEntry.id)
    }
    const entry = await EntriesRepository.start(tagIds, notes)
    dispatch({ type: 'SET_RUNNING', entry })
  }, [state.runningEntry])

  const stopTimer = useCallback(async () => {
    if (!state.runningEntry) return
    await EntriesRepository.stop(state.runningEntry.id)
    dispatch({ type: 'SET_RUNNING', entry: null })
  }, [state.runningEntry])

  return (
    <TimerContext.Provider value={{ state, startTimer, stopTimer }}>
      {children}
    </TimerContext.Provider>
  )
}
