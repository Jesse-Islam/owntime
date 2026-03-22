import { useState, useEffect, type ReactNode } from 'react'
import { ThemeContext, type ThemeId } from '../store/themeStore'

const STORAGE_KEY = 'owntime-theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    return (localStorage.getItem(STORAGE_KEY) as ThemeId | null) ?? 'slate'
  })

  const setTheme = (t: ThemeId) => {
    setThemeState(t)
    localStorage.setItem(STORAGE_KEY, t)
  }

  // Apply data-theme to root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Apply on first paint too
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
