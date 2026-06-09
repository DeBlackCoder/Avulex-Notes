'use client'
import { useEffect, useState } from 'react'
import { getDB, type LocalNote } from '@/lib/db'
import { AppShell } from '@/components/layout/AppShell'
import { useUpdateNote, useDeleteNote } from '@/hooks/useNotes'
import { Button } from '@/components/ui/button'
import { Trash2, RotateCcw } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

export default function TrashPage() {
  const [notes, setNotes] = useState<LocalNote[]>([])
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()
  const qc = useQueryClient()

  const load = async () => {
    const all = await getDB().notes.filter(n => n.isTrashed).toArray()
    all.sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0))
    setNotes(all)
  }

  useEffect(() => { load() }, [])

  const restore = async (note: LocalNote) => {
    await updateNote.mutateAsync({ id: note.id, changes: { isTrashed: false, trashedAt: null } })
    toast.success('Restored')
    load()
  }

  const permDelete = async (note: LocalNote) => {
    if (!confirm(`Permanently delete "${note.title || 'Untitled'}"? This cannot be undone.`)) return
    await deleteNote.mutateAsync(note.id)
    toast.success('Permanently deleted')
    load()
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-2">
          <Trash2 className="w-5 h-5 text-destructive" />
          <h1 className="text-xl font-semibold">Trash</h1>
          <span className="text-sm text-muted-foreground">({notes.length})</span>
        </div>
        <p className="text-xs text-muted-foreground mb-6">Notes are permanently deleted after 30 days.</p>

        {notes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Trash2 className="w-12 h-12 opacity-20" />
            <p className="text-sm">Trash is empty</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map(note => (
              <div key={note.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{note.title || 'Untitled'}</p>
                  <p className="text-xs text-muted-foreground">
                    Trashed {note.trashedAt ? timeAgo(note.trashedAt) : 'recently'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => restore(note)}>
                  <RotateCcw className="w-3.5 h-3.5" /> Restore
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive" onClick={() => permDelete(note)}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
