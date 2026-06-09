'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { NoteCard } from '@/components/notes/NoteCard'
import { useNotes, useCreateNote } from '@/hooks/useNotes'
import { useNotebooks } from '@/hooks/useNotebooks'
import { Button } from '@/components/ui/button'
import { Plus, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

export function NotesListClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const notebookId = searchParams.get('notebook') ?? undefined
  const { data: notes = [], isLoading } = useNotes(notebookId)
  const { data: notebooks = [] } = useNotebooks()
  const createNote = useCreateNote()

  const currentNotebook = notebooks.find(nb => nb.id === notebookId)

  const handleNew = async () => {
    const nbId = notebookId || notebooks[0]?.id
    if (!nbId) { toast.error('Create a notebook first'); return }
    const note = await createNote.mutateAsync({ notebookId: nbId, title: 'Untitled' })
    router.push(`/notes/${note.id}`)
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold">
              {currentNotebook ? currentNotebook.name : 'All Notes'}
            </h1>
            <span className="text-sm text-muted-foreground">({notes.length})</span>
          </div>
          <Button onClick={handleNew} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> New Note
          </Button>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && notes.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <BookOpen className="w-12 h-12 opacity-20" />
            <p className="text-sm">No notes yet</p>
            <Button onClick={handleNew} variant="outline" size="sm">Create your first note</Button>
          </div>
        )}

        {!isLoading && notes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {notes.map(n => <NoteCard key={n.id} note={n} />)}
          </div>
        )}
      </div>
    </AppShell>
  )
}
