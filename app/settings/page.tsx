'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Sun, Moon, Monitor, LogOut, Sparkles, ExternalLink, CheckCircle2, XCircle, Zap } from 'lucide-react'

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

export default function SettingsPage() {
  const { theme, accent, setTheme, setAccent } = useTheme()
  const { user, signOut } = useAuth()
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null)

  useEffect(() => {
    fetch('/api/ai/status').then(r => r.json()).then(setAiStatus).catch(() => {})
  }, [])

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5 pb-24 md:pb-8">
        <h1 className="text-xl font-semibold">Settings</h1>

        {/* Profile */}
        <Card className="rounded-2xl">
          <CardContent className="pt-5 flex items-center gap-4">
            <Avatar className="w-14 h-14 shrink-0">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="font-bold text-lg">{user?.displayName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{user?.displayName}</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2 shrink-0 rounded-xl" onClick={signOut}>
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Appearance</CardTitle>
            <CardDescription>Customize how Avulex Notes looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-sm font-medium mb-3">Theme</p>
              <div className="flex gap-2">
                {[
                  { key: 'light',  label: 'Light',  icon: Sun },
                  { key: 'dark',   label: 'Dark',   icon: Moon },
                  { key: 'system', label: 'System', icon: Monitor },
                ].map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    variant={theme === key ? 'default' : 'outline'}
                    size="sm"
                    className="gap-2 rounded-xl flex-1"
                    onClick={() => setTheme(key as 'light' | 'dark' | 'system')}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </Button>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-3">Accent Color</p>
              <div className="flex gap-3 flex-wrap">
                {ACCENTS.map(({ key, label, color }) => (
                  <button
                    key={key}
                    title={label}
                    onClick={() => setAccent(key)}
                    className={cn(
                      'w-9 h-9 rounded-full transition-all border-2 active:scale-95',
                      color,
                      accent === key ? 'border-foreground scale-110 shadow-lg' : 'border-transparent'
                    )}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Provider */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Assistant
            </CardTitle>
            <CardDescription>
              Both providers are free. Configure at least one API key to enable AI features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">

            {/* Active provider banner */}
            {aiStatus && (
              <div className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm',
                aiStatus.configured
                  ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              )}>
                {aiStatus.configured
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                  : <XCircle className="w-4 h-4 shrink-0" />
                }
                <span className="font-medium">
                  {aiStatus.configured
                    ? `Active: ${aiStatus.provider === 'gemini' ? 'Google Gemini' : 'Groq LLaMA 3'}`
                    : 'No AI provider configured — add an API key below'
                  }
                </span>
              </div>
            )}

            {/* Provider cards */}
            {aiStatus && Object.entries(aiStatus.providers).map(([key, info]) => (
              <div key={key} className={cn(
                'flex items-start gap-3 p-3 rounded-xl border transition-colors',
                info.configured
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border bg-muted/30'
              )}>
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
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
                      ? <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-0">✓ Configured</Badge>
                      : <Badge variant="outline" className="text-xs">Not set</Badge>
                    }
                    {aiStatus.provider === key && info.configured && (
                      <Badge className="text-xs bg-primary/10 text-primary border-0">Active</Badge>
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
              <div className="h-20 rounded-xl bg-muted animate-pulse" />
            )}
          </CardContent>
        </Card>

        {/* Install PWA */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Install App</CardTitle>
            <CardDescription>Install Avulex Notes on your device for a native experience</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              In your browser, tap the share icon or address bar menu and select{' '}
              <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>.
            </p>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'End-to-end encryption', enabled: true },
              { label: 'Sync over HTTPS', enabled: true },
              { label: 'Per-user data isolation', enabled: true },
            ].map(({ label, enabled }) => (
              <div key={label} className="flex items-center justify-between">
                <p className="text-sm">{label}</p>
                <Badge className={cn(
                  'text-xs border-0',
                  enabled
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {enabled ? '✓ Enabled' : 'Disabled'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
