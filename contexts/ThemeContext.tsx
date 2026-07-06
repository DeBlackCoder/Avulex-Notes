'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'
type Accent = 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'red'

interface ThemeContextType {
  theme: Theme
  accent: Accent
  setTheme: (t: Theme) => void
  setAccent: (a: Accent) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system', accent: 'blue',
  setTheme: () => {}, setAccent: () => {},
})

const ACCENT_COLORS: Record<Accent, string> = {
  blue:   '221.2 83.2% 53.3%',
  purple: '262.1 83.3% 57.8%',
  green:  '142.1 76.2% 36.3%',
  orange: '24.6 95% 53.1%',
  pink:   '330.4 81.2% 60.4%',
  red:    '0 84.2% 60.2%',
}

async function saveSettingsToServer(patch: Record<string, unknown>) {
  try {
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  } catch { /* silently fail — local prefs still work */ }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [accent, setAccentState] = useState<Accent>('blue')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // 1. Apply local prefs immediately (fast, no network)
    const savedTheme = localStorage.getItem('avulex_theme') as Theme | null
    const savedAccent = localStorage.getItem('avulex_accent') as Accent | null
    if (savedTheme) setThemeState(savedTheme)
    if (savedAccent) setAccentState(savedAccent)

    // 2. Fetch server settings to restore across devices
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        const s = data.settings
        if (!s) return
        if (s.theme && !savedTheme) {
          setThemeState(s.theme)
          localStorage.setItem('avulex_theme', s.theme)
        }
        if (s.accentColor && !savedAccent) {
          setAccentState(s.accentColor)
          localStorage.setItem('avulex_accent', s.accentColor)
        }
      })
      .catch(() => {})
  }, [])

  // Apply theme to DOM
  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    if (theme === 'system') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', dark)
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = (e: MediaQueryListEvent) => root.classList.toggle('dark', e.matches)
      mq.addEventListener('change', listener)
      return () => mq.removeEventListener('change', listener)
    } else {
      root.classList.toggle('dark', theme === 'dark')
    }
  }, [theme, mounted])

  // Apply accent color
  useEffect(() => {
    if (!mounted) return
    document.documentElement.style.setProperty('--primary-hsl', ACCENT_COLORS[accent])
  }, [accent, mounted])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('avulex_theme', t)
    saveSettingsToServer({ theme: t })
  }

  const setAccent = (a: Accent) => {
    setAccentState(a)
    localStorage.setItem('avulex_accent', a)
    saveSettingsToServer({ accentColor: a })
  }

  return (
    <ThemeContext.Provider value={{ theme, accent, setTheme, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
