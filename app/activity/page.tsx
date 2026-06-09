'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'

interface ActivityEntry {
  _id: string
  action: string
  targetType: string
  targetId: string
  targetName: string
  occurredAt: string
}

const ACTION_LABELS: Record<string, string> = {
  note_created: 'Created note',
  note_saved: 'Edited note',
  note_renamed: 'Renamed note',
  note_trashed: 'Trashed note',
  note_restored: 'Restored note',
  note_archived: 'Archived note',
  note_unarchived: 'Unarchived note',
  note_favorited: 'Favorited note',
  note_unfavorited: 'Unfavorited note',
  note_pinned: 'Pinned note',
  note_unpinned: 'Unpinned note',
  notebook_created: 'Created notebook',
  notebook_renamed: 'Renamed notebook',
  notebook_deleted: 'Deleted notebook',
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
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Activity Timeline</h1>
        </div>

        {loading && (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Clock className="w-12 h-12 opacity-20" />
            <p className="text-sm">No activity yet</p>
          </div>
        )}

        {!loading && entries.length > 0 && (
          <div className="space-y-1">
            {entries.map(entry => (
              <button
                key={entry._id}
                onClick={() => {
                  if (entry.targetType === 'note' && entry.targetId) {
                    router.push(`/notes/${entry.targetId}`)
                  }
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{ACTION_LABELS[entry.action] || entry.action}</p>
                  <p className="text-xs text-muted-foreground truncate">{entry.targetName || 'Untitled'}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(entry.occurredAt).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
