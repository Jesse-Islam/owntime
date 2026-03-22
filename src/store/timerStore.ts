/**
 * Global timer state using React context + useReducer.
 * Keeps UI in sync with the running entry without prop-drilling.
 */
import { createContext, useContext } from 'react'
import type { TimeEntry } from '../db/schema'

export interface TimerState {
  runningEntry: TimeEntry | null
  /** ms elapsed since startedAt, updated each second while running */
  elapsedMs: number
  isLoading: boolean
}

export type TimerAction =
  | { type: 'SET_RUNNING'; entry: TimeEntry | null }
  | { type: 'TICK'; elapsedMs: number }
  | { type: 'SET_LOADING'; loading: boolean }

export function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'SET_RUNNING':
      return { ...state, runningEntry: action.entry, elapsedMs: 0, isLoading: false }
    case 'TICK':
      return { ...state, elapsedMs: action.elapsedMs }
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading }
    default:
      return state
  }
}

export const initialTimerState: TimerState = {
  runningEntry: null,
  elapsedMs: 0,
  isLoading: false,
}

export interface TimerContextValue {
  state: TimerState
  startTimer: (tagIds?: string[], notes?: string) => Promise<void>
  stopTimer: () => Promise<void>
  /** Restore a running entry into the store without touching the DB (DB already updated). */
  restoreTimer: (entry: TimeEntry) => void
}

export const TimerContext = createContext<TimerContextValue | null>(null)

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimer must be used within TimerProvider')
  return ctx
}
