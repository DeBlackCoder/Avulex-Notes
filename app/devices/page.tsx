'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Monitor, Smartphone, LogOut, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface DeviceEntry {
  _id: string
  deviceName: string
  os: string
  browserName: string
  lastActiveAt: string
  signedInAt: string
  isCurrent?: boolean
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)

  const load = async () => {
    try {
      const r = await fetch('/api/devices')
      const d = await r.json()
      setDevices(d.devices || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const revoke = async (id: string, isCurrent: boolean) => {
    if (isCurrent) {
      if (!confirm('Sign out of this device? You will be redirected to login.')) return
    }
    setRevoking(id)
    try {
      await fetch(`/api/devices/${id}`, { method: 'DELETE' })
      toast.success('Device signed out')
      if (isCurrent) window.location.href = '/login'
      else load()
    } catch {
      toast.error('Failed to sign out device')
    } finally {
      setRevoking(null)
    }
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Monitor className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Devices</h1>
        </div>

        {loading && <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>}

        {!loading && devices.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Monitor className="w-12 h-12 opacity-20" />
            <p className="text-sm">No devices found</p>
          </div>
        )}

        {!loading && devices.map(device => (
          <div key={device._id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card mb-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              {device.os?.toLowerCase().includes('android') || device.os?.toLowerCase().includes('ios')
                ? <Smartphone className="w-5 h-5 text-muted-foreground" />
                : <Monitor className="w-5 h-5 text-muted-foreground" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{device.deviceName || 'Unknown device'}</p>
                {device.isCurrent && <Badge variant="secondary" className="text-xs">This device</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{device.os} · {device.browserName}</p>
              <p className="text-xs text-muted-foreground">
                Last active: {device.lastActiveAt ? new Date(device.lastActiveAt).toLocaleString() : 'Unknown'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-destructive hover:text-destructive shrink-0"
              disabled={revoking === device._id}
              onClick={() => revoke(device._id, !!device.isCurrent)}
            >
              {revoking === device._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
              Sign out
            </Button>
          </div>
        ))}
      </div>
    </AppShell>
  )
}
