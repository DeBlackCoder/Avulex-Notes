'use client'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

interface Props {
  /** 'icon' = single button that cycles through modes, 'segmented' = 3-button row */
  variant?: 'icon' | 'segmented'
  className?: string
}

const MODES = [
  { key: 'light',  icon: Sun,     label: 'Light' },
  { key: 'dark',   icon: Moon,    label: 'Dark' },
  { key: 'system', icon: Monitor, label: 'Auto' },
] as const

export function ThemeToggle({ variant = 'icon', className }: Props) {
  const { theme, setTheme } = useTheme()

  if (variant === 'segmented') {
    return (
      <div className={cn('flex items-center bg-muted rounded-xl p-0.5 border border-border/50', className)}>
        {MODES.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTheme(key)}
            title={label}
            className={cn(
              'flex items-center justify-center gap-1 flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 touch-manipulation',
              theme === key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    )
  }

  // Icon variant — cycles light → dark → system
  const next: Record<string, 'light' | 'dark' | 'system'> = {
    light: 'dark', dark: 'system', system: 'light',
  }
  const current = MODES.find(m => m.key === theme) ?? MODES[2]
  const Icon = current.icon

  return (
    <button
      onClick={() => setTheme(next[theme] ?? 'system')}
      title={`Theme: ${current.label} — click to change`}
      className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150',
        'hover:bg-accent active:bg-accent/80 text-muted-foreground hover:text-foreground',
        'touch-manipulation active:scale-[0.93]',
        className
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}
