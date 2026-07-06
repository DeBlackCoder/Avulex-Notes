'use client'
import { useSearch, type NoteSearchResult, type NotebookSearchResult } from '@/hooks/useSearch'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, BookOpen, Search } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
}

export function SearchModal({ open, onClose }: Props) {
  const { query, setQuery, results, isSearching } = useSearch()
  const router = useRouter()

  const handleClose = () => {
    onClose()
    setQuery('')
  }

  const handleNoteSelect = (noteId: string) => {
    router.push(`/notes/${noteId}`)
    handleClose()
  }

  const handleNotebookSelect = (notebookId: string) => {
    router.push(`/notes?notebook=${notebookId}`)
    handleClose()
  }

  const noteResults = results.filter((r): r is NoteSearchResult => r.type === 'note')
  const notebookResults = results.filter((r): r is NotebookSearchResult => r.type === 'notebook')

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search notes, titles, content, notebooks…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0 p-0 text-base bg-transparent"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
              Clear
            </button>
          )}
        </div>

        <ScrollArea className="max-h-[65vh]">

          {/* Empty / hint states */}
          {query.length < 2 && (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Search className="w-8 h-8 opacity-20" />
              <p className="text-sm">Type to search notes, content &amp; notebooks</p>
            </div>
          )}

          {query.length >= 2 && !isSearching && results.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <FileText className="w-8 h-8 opacity-20" />
              <p className="text-sm">No results for &ldquo;{query}&rdquo;</p>
            </div>
          )}

          {/* Notebook results */}
          {notebookResults.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-1.5">
                Notebooks
              </p>
              {notebookResults.map(r => (
                <button
                  key={r.notebook.id}
                  onClick={() => handleNotebookSelect(r.notebook.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors border-b border-border/40 last:border-0"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{r.notebook.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.noteCount} note{r.noteCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Note results */}
          {noteResults.length > 0 && (
            <div>
              {notebookResults.length > 0 && (
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-1.5">
                  Notes
                </p>
              )}
              {noteResults.map(r => (
                <button
                  key={r.note.id}
                  onClick={() => handleNoteSelect(r.note.id)}
                  className="w-full flex flex-col gap-1 px-4 py-3.5 text-left hover:bg-accent transition-colors border-b border-border/40 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">{r.note.title || 'Untitled'}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.matchType === 'title' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">title</span>
                      )}
                      <span className="text-xs text-muted-foreground">{timeAgo(r.note.updatedAt)}</span>
                    </div>
                  </div>
                  {r.notebookName && (
                    <span className="text-[11px] text-muted-foreground/70 ml-5">{r.notebookName}</span>
                  )}
                  {r.matchType === 'body' && r.excerpt && (
                    <p className="text-xs text-muted-foreground line-clamp-2 ml-5 mt-0.5 leading-relaxed">
                      {r.excerpt}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
