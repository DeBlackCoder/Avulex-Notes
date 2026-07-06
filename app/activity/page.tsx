'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Clock, FileText, BookOpen, Star, StarOff, Pin, PinOff, Archive, ArchiveRestore, Trash2, RotateCcw, Pencil, Plus } from 'lucide-react'

interface ActivityEntry {
  _id: string
  action: string
  targetType: string
  targetId: string
  targetName: string
  occurredAt: string
}

const ACTION_LABELS: Record<string, string> = {
  note_created:     'Created note',
  note_saved:       'Edited note',
  note_renamed:     'Renamed note',
  note_trashed:     'Trashed note',
  note_restored:    'Restored note',
  note_archived:    'Archived note',
  note_unarchived:  'Unarchived note',
  note_favorited:   'Favorited note',
  note_unfavorited: 'Unfavorited note',
  note_pinned:      'Pinned note',
  note_unpinned:    'Unpinned note',
  notebook_created: 'Created notebook',
  notebook_renamed: 'Renamed notebook',
  notebook_deleted: 'Deleted notebook',
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  note_created:     Plus,
  note_saved:       Pencil,
  note_renamed:     Pencil,
  note_trashed:     Trash2,
  note_restored:    RotateCcw,
  note_archived:    Archive,
  note_unarchived:  ArchiveRestore,
  note_favorited:   Star,
  note_unfavorited: StarOff,
  note_pinned:      Pin,
  note_unpinned:    PinOff,
  notebook_created: BookOpen,
  notebook_renamed: BookOpen,
  notebook_deleted: BookOpen,
}

const ACTION_COLORS: Record<string, string> = {
  note_created:     'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
  note_saved:       'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
  note_renamed:     'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
  note_trashed:     'bg-destructive/10 text-destructive',
  note_restored:    'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
  note_archived:    'bg-muted text-muted-foreground',
  note_unarchived:  'bg-muted text-muted-foreground',
  note_favorited:   'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
  note_unfavorited: 'bg-muted text-muted-foreground',
  note_pinned:      'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400',
  note_unpinned:    'bg-muted text-muted-foreground',
  notebook_created: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
  notebook_renamed: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
  notebook_deleted: 'bg-destructive/10 text-destructive',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ActivityPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/activity')
      .then(r => r.json())
      .then(d => { setEntries(d.entries || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">Activity</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Your recent actions</p>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-[60px] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && entries.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 border border-border/40 flex items-center justify-center">
              <Clock className="w-7 h-7 opacity-30" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium text-foreground text-sm">No activity yet</p>
              <p className="text-xs">Actions on your notes will appear here</p>
            </div>
          </div>
        )}

        {/* Activity list */}
        {!loading && entries.length > 0 && (
          <div className="space-y-1.5">
            {entries.map(entry => {
              const Icon = ACTION_ICONS[entry.action] ?? FileText
              const colorCls = ACTION_COLORS[entry.action] ?? 'bg-muted text-muted-foreground'
              const isNote = entry.targetType === 'note' && entry.targetId
              return (
                <button
                  key={entry._id}
                  onClick={() => { if (isNote) router.push(`/notes/${entry.targetId}`) }}
                  disabled={!isNote}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-accent transition-all duration-150 text-left touch-manipulation active:scale-[0.99] disabled:cursor-default"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorCls}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{ACTION_LABELS[entry.action] || entry.action}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.targetName || 'Untitled'}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {formatDate(entry.occurredAt)}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
