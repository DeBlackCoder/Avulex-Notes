'use client'
import { AppShell } from '@/components/layout/AppShell'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import {
  Sun, Moon, Monitor, LogOut, ChevronRight,
  Bell, BellOff, Palette, User, Shield, Smartphone, Info,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const ACCENTS = [
  { key: 'blue',   label: 'Blue',   bg: 'bg-blue-500' },
  { key: 'purple', label: 'Purple', bg: 'bg-purple-500' },
  { key: 'green',  label: 'Green',  bg: 'bg-green-500' },
  { key: 'orange', label: 'Orange', bg: 'bg-orange-500' },
  { key: 'pink',   label: 'Pink',   bg: 'bg-pink-500' },
  { key: 'red',    label: 'Red',    bg: 'bg-red-500' },
] as const

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">
      {children}
    </p>
  )
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
      {children}
    </div>
  )
}

function SettingsRow({
  icon: Icon,
  label,
  sub,
  children,
  onClick,
  danger,
}: {
  icon: React.ElementType
  label: string
  sub?: string
  children?: React.ReactNode
  onClick?: () => void
  danger?: boolean
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3.5 transition-colors',
        onClick && 'cursor-pointer hover:bg-accent/50 active:bg-accent touch-manipulation',
        danger && 'text-destructive'
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
        danger ? 'bg-destructive/10' : 'bg-muted'
      )}>
        <Icon className={cn('w-4 h-4', danger ? 'text-destructive' : 'text-muted-foreground')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', danger && 'text-destructive')}>{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
      {onClick && !children && <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />}
    </div>
  )
}

export default function SettingsPage() {
  const { theme, accent, setTheme, setAccent } = useTheme()
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  const handleNotificationToggle = async () => {
    if (!notificationsEnabled) {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setNotificationsEnabled(true)
        toast.success('Notifications enabled')
      } else {
        toast.error('Permission denied. Enable notifications in your browser settings.')
      }
    } else {
      setNotificationsEnabled(false)
      toast.success('Notifications disabled')
    }
  }

  return (
    <AppShell>
      <div className="max-w-xl mx-auto px-4 sm:px-6 pb-10 pt-6 space-y-6">

        {/* Profile card */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-violet-500/5 to-primary/5 border border-border/60">
          <Avatar className="w-16 h-16 shrink-0 ring-2 ring-border">
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback className="text-lg font-bold">{user?.displayName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base truncate">{user?.displayName}</p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">Google account</p>
          </div>
        </div>

        {/* Appearance */}
        <div>
          <SectionHeader>Appearance</SectionHeader>
          <SettingsCard>
            {/* Theme */}
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium flex-1">Theme</p>
              </div>
              <div className="flex gap-2 ml-11">
                {[
                  { key: 'light',  label: 'Light',  icon: Sun },
                  { key: 'dark',   label: 'Dark',   icon: Moon },
                  { key: 'system', label: 'Auto',   icon: Monitor },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setTheme(key as 'light' | 'dark' | 'system')}
                    className={cn(
                      'flex items-center gap-1.5 flex-1 justify-center py-2 rounded-xl text-xs font-semibold border transition-all touch-manipulation active:scale-[0.96]',
                      theme === key
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'border-border text-muted-foreground hover:bg-accent'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent color */}
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-500 to-blue-500" />
                </div>
                <p className="text-sm font-medium flex-1">Accent color</p>
              </div>
              <div className="flex gap-3 ml-11">
                {ACCENTS.map(({ key, label, bg }) => (
                  <button
                    key={key}
                    onClick={() => setAccent(key)}
                    title={label}
                    className={cn(
                      'w-8 h-8 rounded-full transition-all touch-manipulation active:scale-[0.90]',
                      bg,
                      accent === key
                        ? 'ring-2 ring-offset-2 ring-offset-card ring-foreground scale-110'
                        : 'opacity-70 hover:opacity-100'
                    )}
                  />
                ))}
              </div>
            </div>
          </SettingsCard>
        </div>

        {/* Notifications */}
        <div>
          <SectionHeader>Notifications</SectionHeader>
          <SettingsCard>
            <SettingsRow
              icon={notificationsEnabled ? Bell : BellOff}
              label="Push notifications"
              sub={notificationsEnabled ? 'You will receive note updates' : 'Stay updated on note changes'}
              onClick={handleNotificationToggle}
            >
              <div className={cn(
                'w-11 h-6 rounded-full transition-all duration-200 relative',
                notificationsEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
              )}>
                <div className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200',
                  notificationsEnabled ? 'left-5' : 'left-0.5'
                )} />
              </div>
            </SettingsRow>
          </SettingsCard>
        </div>

        {/* Account */}
        <div>
          <SectionHeader>Account</SectionHeader>
          <SettingsCard>
            <SettingsRow
              icon={User}
              label="Profile"
              sub="Managed via Google account"
            />
            <SettingsRow
              icon={Smartphone}
              label="Connected devices"
              sub="View and manage signed-in devices"
              onClick={() => router.push('/devices')}
            />
            <SettingsRow
              icon={Shield}
              label="Privacy & security"
              sub="Your notes are end-to-end encrypted"
            />
          </SettingsCard>
        </div>

        {/* About */}
        <div>
          <SectionHeader>About</SectionHeader>
          <SettingsCard>
            <SettingsRow
              icon={Info}
              label="Avulex Notes"
              sub="Version 1.0.0 · Offline-first AI notes"
            />
          </SettingsCard>
        </div>

        {/* Sign out */}
        <div>
          <SettingsCard>
            <SettingsRow
              icon={LogOut}
              label="Sign out"
              sub={user?.email ?? ''}
              onClick={signOut}
              danger
            />
          </SettingsCard>
        </div>

      </div>
    </AppShell>
  )
}
