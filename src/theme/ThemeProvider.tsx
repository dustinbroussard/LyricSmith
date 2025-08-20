import { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react'

type Mode = 'light' | 'dark' | 'system'
type Ctx = { mode: Mode; setMode: (m: Mode) => void }
const ThemeCtx = createContext<Ctx | null>(null)

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem('theme') as Mode) || 'system')

  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const next = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode
    root.classList.toggle('dark', next === 'dark')
    localStorage.setItem('theme', mode)
  }, [mode])

  return <ThemeCtx.Provider value={{ mode, setMode }}>{children}</ThemeCtx.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
