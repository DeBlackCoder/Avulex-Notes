'use client'
import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { NoteCard } from '@/components/notes/NoteCard'
import { useNotes, useCreateNote, useUpdateNote } from '@/hooks/useNotes'
import { useNotebooks } from '@/hooks/useNotebooks'
import { Button } from '@/components/ui/button'
import { Plus, BookOpen, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { CreateNoteModal } from '@/components/ai/CreateNoteModal'

export function NotesListClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const notebookId = searchParams.get('notebook') ?? undefined
  const { data: notes = [], isLoading } = useNotes(notebookId)
  const { data: notebooks = [] } = useNotebooks()
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const currentNotebook = notebooks.find(nb => nb.id === notebookId)

  const handleNew = async () => {
    const nbId = notebookId || notebooks[0]?.id
    if (!nbId) { toast.error('Create a notebook first'); return }
    const note = await createNote.mutateAsync({ notebookId: nbId, title: 'Untitled' })
    router.push(`/notes/${note.id}`)
  }

  const handleAICreate = async (title: string, content: string) => {
    const nbId = notebookId || notebooks[0]?.id
    if (!nbId) { toast.error('Create a notebook first'); return }
    const note = await createNote.mutateAsync({ notebookId: nbId, title })
    // Save the generated content immediately
    await updateNote.mutateAsync({ id: note.id, changes: { title, content, synced: false, updatedAt: Date.now() } })
    toast.success('Note created by AI')
    router.push(`/notes/${note.id}`)
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">
                {currentNotebook ? currentNotebook.name : 'All Notes'}
              </h1>
              <p className="text-xs text-muted-foreground">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</p>
            </div>
          </div>
          {/* Desktop buttons */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <Button onClick={() => setCreateModalOpen(true)} size="sm" variant="outline" className="gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/5">
              <Sparkles className="w-4 h-4" /> AI Create
            </Button>
            <Button onClick={handleNew} size="sm" className="gap-2 rounded-xl">
              <Plus className="w-4 h-4" /> New Note
            </Button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && notes.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
            <div className="w-20 h-20 rounded-3xl bg-muted/60 flex items-center justify-center">
              <BookOpen className="w-9 h-9 opacity-30" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium text-foreground">No notes yet</p>
              <p className="text-sm">Create manually or let AI write one for you</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleNew} variant="outline" size="sm" className="rounded-xl gap-2">
                <Plus className="w-4 h-4" /> Create note
              </Button>
              <Button onClick={() => setCreateModalOpen(true)} size="sm" className="rounded-xl gap-2">
                <Sparkles className="w-4 h-4" /> AI Create
              </Button>
            </div>
          </div>
        )}

        {/* Notes grid */}
        {!isLoading && notes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {notes.map(n => <NoteCard key={n.id} note={n} />)}
          </div>
        )}
      </div>

      {/* Mobile FABs — stacked: AI Create above New Note */}
      <div className="fixed sm:hidden z-10 flex flex-col gap-3 items-end"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)', right: '1rem' }}>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center transition-all active:scale-[0.93] touch-manipulation"
          aria-label="AI Create note"
        >
          <Sparkles className="w-5 h-5" />
        </button>
        <button
          onClick={handleNew}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center transition-all active:scale-[0.93] touch-manipulation"
          aria-label="New note"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <CreateNoteModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleAICreate}
      />
    </AppShell>
  )
}
