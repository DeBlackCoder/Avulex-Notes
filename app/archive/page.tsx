'use client'
import { useEffect, useState } from 'react'
import { getDB, type LocalNote } from '@/lib/db'
import { AppShell } from '@/components/layout/AppShell'
import { NoteCard } from '@/components/notes/NoteCard'
import { Archive } from 'lucide-react'

export default function ArchivePage() {
  const [notes, setNotes] = useState<LocalNote[]>([])

  useEffect(() => {
    getDB().notes.filter(n => n.isArchived && !n.isTrashed).toArray().then(setNotes)
  }, [])

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center shrink-0">
            <Archive className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">Archive</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</p>
          </div>
        </div>

        {notes.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 border border-border/40 flex items-center justify-center">
              <Archive className="w-7 h-7 opacity-30" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium text-foreground text-sm">Nothing archived yet</p>
              <p className="text-xs">Archived notes will appear here</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {notes.map(n => <NoteCard key={n.id} note={n} />)}
          </div>
        )}
      </div>
    </AppShell>
  )
}
