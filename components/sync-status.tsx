'use client'
import { Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle2, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SyncStatus } from '@/hooks/useSync'
import { timeAgo } from '@/lib/utils'

const icons: Record<SyncStatus, React.ReactNode> = {
  synced:  <CheckCircle2 className="w-4 h-4 text-green-500" />,
  syncing: <RefreshCw   className="w-4 h-4 text-blue-500 animate-spin" />,
  pulling: <Download    className="w-4 h-4 text-violet-500 animate-pulse" />,
  queued:  <Cloud       className="w-4 h-4 text-yellow-500" />,
  error:   <AlertCircle className="w-4 h-4 text-red-500" />,
  offline: <CloudOff    className="w-4 h-4 text-zinc-400" />,
}

const labels: Record<SyncStatus, string> = {
  synced:  'Synced',
  syncing: 'Syncing…',
  pulling: 'Pulling…',
  queued:  'Queued changes',
  error:   'Sync error',
  offline: 'Offline',
}

interface Props {
  status: SyncStatus
  lastSync: number | null
  className?: string
}

export function SyncStatusBadge({ status, lastSync, className }: Props) {
  return (
    <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      {icons[status]}
      <span>{labels[status]}</span>
      {lastSync && status === 'synced' && (
        <span className="text-zinc-400">· {timeAgo(lastSync)}</span>
      )}
      {!lastSync && status === 'synced' && (
        <span className="text-zinc-400">· Never synced</span>
      )}
    </div>
  )
}
