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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">Trash</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-6 ml-0.5">Notes are permanently deleted after 30 days.</p>

        {notes.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 border border-border/40 flex items-center justify-center">
              <Trash2 className="w-7 h-7 opacity-30" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium text-foreground text-sm">Trash is empty</p>
              <p className="text-xs">Deleted notes will appear here</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map(note => (
              <div key={note.id} className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/60 bg-card transition-colors hover:bg-muted/30">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{note.title || 'Untitled'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Trashed {note.trashedAt ? timeAgo(note.trashedAt) : 'recently'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs h-9 px-3 rounded-xl touch-manipulation"
                    onClick={() => restore(note)}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs h-9 px-3 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 touch-manipulation"
                    onClick={() => permDelete(note)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
