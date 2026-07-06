'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Sun, Moon, Monitor, LogOut, Sparkles, ExternalLink, CheckCircle2, XCircle, Zap, ChevronRight, Shield, Smartphone } from 'lucide-react'

const ACCENTS = [
  { key: 'blue',   label: 'Blue',   color: 'bg-blue-500' },
  { key: 'purple', label: 'Purple', color: 'bg-purple-500' },
  { key: 'green',  label: 'Green',  color: 'bg-green-500' },
  { key: 'orange', label: 'Orange', color: 'bg-orange-500' },
  { key: 'pink',   label: 'Pink',   color: 'bg-pink-500' },
  { key: 'red',    label: 'Red',    color: 'bg-red-500' },
] as const

interface AIStatus {
  provider: string
  configured: boolean
  providers: {
    gemini: { configured: boolean; label: string; freeLimit: string; getKeyUrl: string }
    groq:   { configured: boolean; label: string; freeLimit: string; getKeyUrl: string }
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-3">{title}</p>
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
        {children}
      </div>
    </div>
  )
}

function SettingRow({
  icon: Icon,
  label,
  description,
  right,
  onClick,
  iconBg = 'bg-muted',
  iconColor = 'text-muted-foreground',
}: {
  icon: React.ElementType
  label: string
  description?: string
  right?: React.ReactNode
  onClick?: () => void
  iconBg?: string
  iconColor?: string
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3.5 transition-colors duration-150',
        onClick && 'cursor-pointer hover:bg-muted/40 active:bg-muted/60 touch-manipulation'
      )}
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        <Icon className={cn('w-4 h-4', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {right ?? (onClick && <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />)}
    </div>
  )
}

export default function SettingsPage() {
  const { theme, accent, setTheme, setAccent } = useTheme()
  const { user, signOut } = useAuth()
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null)

  useEffect(() => {
    fetch('/api/ai/status').then(r => r.json()).then(setAiStatus).catch(() => {})
  }, [])

  return (
    <AppShell>
      <div className="max-w-xl mx-auto px-4 sm:px-5 py-6 space-y-6 pb-24 md:pb-8">
        <h1 className="text-xl font-bold">Settings</h1>

        {/* Profile */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-4">
            <Avatar className="w-14 h-14 shrink-0">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="font-bold text-lg bg-gradient-to-br from-violet-500 to-blue-500 text-white">
                {user?.displayName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{user?.displayName}</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Separator />
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-destructive hover:bg-destructive/5 active:bg-destructive/10 transition-colors duration-150 touch-manipulation"
          >
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">Sign out</span>
          </button>
        </div>

        {/* Appearance */}
        <Section title="Appearance">
          {/* Theme */}
          <div className="px-4 py-4 space-y-3">
            <p className="text-sm font-medium">Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'light', label: 'Light', icon: Sun },
                { key: 'dark', label: 'Dark', icon: Moon },
                { key: 'system', label: 'System', icon: Monitor },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTheme(key as 'light' | 'dark' | 'system')}
                  className={cn(
                    'flex flex-col items-center gap-2 py-3 px-2 rounded-2xl border-2 text-xs font-medium transition-all duration-150 active:scale-[0.97] touch-manipulation',
                    theme === key
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border/50 text-muted-foreground hover:border-border hover:bg-muted/40'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Accent color */}
          <div className="px-4 py-4 space-y-3">
            <p className="text-sm font-medium">Accent Color</p>
            <div className="flex gap-3 flex-wrap">
              {ACCENTS.map(({ key, label, color }) => (
                <button
                  key={key}
                  title={label}
                  onClick={() => setAccent(key)}
                  className={cn(
                    'w-10 h-10 rounded-full transition-all duration-150 border-2 active:scale-95 touch-manipulation',
                    color,
                    accent === key
                      ? 'border-foreground scale-110 shadow-lg ring-2 ring-background ring-offset-0'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  )}
                />
              ))}
            </div>
          </div>
        </Section>

        {/* AI Assistant */}
        <Section title="AI Assistant">
          <div className="px-4 py-4 space-y-3">
            {/* Active provider banner */}
            {aiStatus && (
              <div className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm',
                aiStatus.configured
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              )}>
                {aiStatus.configured
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                  : <XCircle className="w-4 h-4 shrink-0" />
                }
                <span className="font-medium text-xs">
                  {aiStatus.configured
                    ? `Active: ${aiStatus.provider === 'gemini' ? 'Google Gemini' : 'Groq LLaMA 3'}`
                    : 'No AI provider configured — add an API key'
                  }
                </span>
              </div>
            )}

            {/* Provider cards */}
            {aiStatus && Object.entries(aiStatus.providers).map(([key, info]) => (
              <div key={key} className={cn(
                'flex items-start gap-3 p-3 rounded-2xl border transition-colors',
                info.configured
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border bg-muted/30'
              )}>
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  key === 'gemini' ? 'bg-blue-100 dark:bg-blue-950' : 'bg-orange-100 dark:bg-orange-950'
                )}>
                  {key === 'gemini'
                    ? <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    : <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{info.label}</p>
                    {info.configured
                      ? <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-0 gap-1"><CheckCircle2 className="w-3 h-3" /> Configured</Badge>
                      : <Badge variant="outline" className="text-[10px]">Not set</Badge>
                    }
                    {aiStatus.provider === key && info.configured && (
                      <Badge className="text-[10px] bg-primary/10 text-primary border-0">Active</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Free · {info.freeLimit}</p>
                  {!info.configured && (
                    <a
                      href={info.getKeyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary mt-1.5 hover:underline"
                    >
                      Get free API key <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {!info.configured && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Add <code className="bg-muted px-1 rounded text-[11px]">
                        {key === 'gemini' ? 'GEMINI_API_KEY' : 'GROQ_API_KEY'}
                      </code> to <code className="bg-muted px-1 rounded text-[11px]">.env.local</code>
                    </p>
                  )}
                </div>
              </div>
            ))}

            {!aiStatus && (
              <div className="h-24 rounded-2xl bg-muted animate-pulse" />
            )}
          </div>
        </Section>

        {/* App & Security */}
        <Section title="App">
          <SettingRow
            icon={Smartphone}
            label="Install App"
            description="Add to Home Screen for a native experience"
            iconBg="bg-blue-100 dark:bg-blue-950"
            iconColor="text-blue-600 dark:text-blue-400"
          />
        </Section>

        <Section title="Security">
          {[
            { label: 'End-to-end encryption', enabled: true },
            { label: 'Sync over HTTPS', enabled: true },
            { label: 'Per-user data isolation', enabled: true },
          ].map(({ label, enabled }) => (
            <SettingRow
              key={label}
              icon={Shield}
              label={label}
              iconBg="bg-emerald-100 dark:bg-emerald-950"
              iconColor="text-emerald-600 dark:text-emerald-400"
              right={
                <Badge className={cn(
                  'text-[10px] border-0 gap-1',
                  enabled
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {enabled && <CheckCircle2 className="w-3 h-3" />}
                  {enabled ? 'On' : 'Off'}
                </Badge>
              }
            />
          ))}
        </Section>

      </div>
    </AppShell>
  )
}
