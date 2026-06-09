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
  blue: '221.2 83.2% 53.3%',
  purple: '262.1 83.3% 57.8%',
  green: '142.1 76.2% 36.3%',
  orange: '24.6 95% 53.1%',
  pink: '330.4 81.2% 60.4%',
  red: '0 84.2% 60.2%',
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Start with server-safe defaults — no localStorage access here
  const [theme, setThemeState] = useState<Theme>('system')
  const [accent, setAccentState] = useState<Accent>('blue')
  const [mounted, setMounted] = useState(false)

  // Only run after mount (client-only)
  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('avulex_theme') as Theme | null
    const savedAccent = localStorage.getItem('avulex_accent') as Accent | null
    if (savedTheme) setThemeState(savedTheme)
    if (savedAccent) setAccentState(savedAccent)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    if (theme === 'system') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', dark)
      // Also listen for OS changes
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = (e: MediaQueryListEvent) => root.classList.toggle('dark', e.matches)
      mq.addEventListener('change', listener)
      return () => mq.removeEventListener('change', listener)
    } else {
      root.classList.toggle('dark', theme === 'dark')
    }
  }, [theme, mounted])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.style.setProperty('--primary-hsl', ACCENT_COLORS[accent])
  }, [accent, mounted])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('syncnote_theme', t)
  }

  const setAccent = (a: Accent) => {
    setAccentState(a)
    localStorage.setItem('syncnote_accent', a)
  }

  return (
    <ThemeContext.Provider value={{ theme, accent, setTheme, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
