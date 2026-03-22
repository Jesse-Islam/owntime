import { createContext, useContext } from 'react'

export type ThemeId = 'slate' | 'carbon' | 'sand' | 'frost'

export interface ThemeOption {
  id: ThemeId
  label: string
  bg: string      // swatch preview color
  surface: string
  dark: boolean
}

export const THEMES: ThemeOption[] = [
  { id: 'slate',  label: 'Slate',  bg: '#0f172a', surface: '#1e293b', dark: true  },
  { id: 'carbon', label: 'Carbon', bg: '#0a0a0a', surface: '#161616', dark: true  },
  { id: 'sand',   label: 'Sand',   bg: '#faf7f0', surface: '#f2ede4', dark: false },
  { id: 'frost',  label: 'Frost',  bg: '#f8fafc', surface: '#f1f5f9', dark: false },
]

export interface ThemeContextValue {
  theme: ThemeId
  setTheme: (t: ThemeId) => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'slate',
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}
