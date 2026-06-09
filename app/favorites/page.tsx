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
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Star className="w-5 h-5 text-yellow-500" />
          <h1 className="text-xl font-semibold">Favorites</h1>
          <span className="text-sm text-muted-foreground">({notes.length})</span>
        </div>
        {notes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Star className="w-12 h-12 opacity-20" />
            <p className="text-sm">No favorite notes yet</p>
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
