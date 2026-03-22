import { Check } from 'lucide-react'
import { THEMES } from '../store/themeStore'
import { useTheme } from '../store/themeStore'

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide ot-muted mb-2">Theme</p>
      <div className="grid grid-cols-4 gap-1.5">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            title={t.label}
            className="relative flex flex-col items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ot-accent)] rounded"
          >
            {/* Swatch */}
            <span
              className="w-full h-7 rounded-md border-2 flex items-center justify-center transition-all"
              style={{
                backgroundColor: t.bg,
                borderColor: theme === t.id ? 'var(--ot-accent)' : 'transparent',
                boxShadow: theme === t.id ? `0 0 0 1px var(--ot-accent)` : undefined,
              }}
            >
              {theme === t.id && (
                <Check
                  className="w-3 h-3"
                  style={{ color: t.dark ? '#e2e8f0' : '#1e293b' }}
                />
              )}
            </span>
            <span className="text-[9px] ot-muted leading-none">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
