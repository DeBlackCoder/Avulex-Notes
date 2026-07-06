'use client'
import { useEffect, useState } from 'react'
import { getDB, type LocalNote } from '@/lib/db'
import { AppShell } from '@/components/layout/AppShell'
import { NoteCard } from '@/components/notes/NoteCard'
import { Star } from 'lucide-react'

export default function FavoritesPage() {
  const [notes, setNotes] = useState<LocalNote[]>([])

  useEffect(() => {
    getDB().notes.filter(n => n.isFavorite && !n.isTrashed && !n.isArchived).toArray().then(setNotes)
  }, [])

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center shrink-0">
            <Star className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">Favorites</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</p>
          </div>
        </div>

        {notes.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/30 flex items-center justify-center">
              <Star className="w-7 h-7 text-amber-300 dark:text-amber-700" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium text-foreground text-sm">No favorites yet</p>
              <p className="text-xs">Star a note to save it here</p>
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
