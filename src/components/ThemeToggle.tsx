import { useTheme } from '@/theme/ThemeProvider'

export default function ThemeToggle() {
  const { mode, setMode } = useTheme()
  return (
    <div className="inline-flex rounded-xl border border-border bg-surface text-text shadow-sm"
         role="radiogroup" aria-label="Theme">
      {(['light','dark','system'] as const).map(opt => (
        <button
          key={opt}
          role="radio"
          aria-checked={mode===opt}
          aria-label={opt}
          onClick={() => setMode(opt)}
          className={`px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus
                      ${mode===opt ? 'bg-primary text-cream shadow-glow' : 'hover:bg-muted/10'}`}
        >
          <i className={`fas fa-${opt==='light'?'sun':opt==='dark'?'moon':'desktop'}`}></i>
        </button>
      ))}
    </div>
  )
}
