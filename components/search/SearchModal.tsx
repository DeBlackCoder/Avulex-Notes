'use client'
import { useSearch, type NoteSearchResult, type NotebookSearchResult } from '@/hooks/useSearch'
import { useRouter } from 'next/navigation'
import { useRef, useEffect } from 'react'
import { FileText, BookOpen, Search, X, Loader2, FileX, Clock } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
}

function highlight(text: string, query: string) {
  const words = query.trim().split(/\s+/).filter(w => w.length >= 2)
  if (words.length === 0) return <>{text}</>
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        words.some(w => w.toLowerCase() === part.toLowerCase())
          ? <mark key={i} className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded-sm px-px not-italic">{part}</mark>
          : part
      )}
    </>
  )
}

export function SearchModal({ open, onClose }: Props) {
  const { query, setQuery, results, isSearching } = useSearch()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleClose = () => { onClose(); setQuery('') }

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
  const hasResults = results.length > 0

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [query])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />

      {/* Search sheet — anchored to top on mobile, centered on desktop */}
      <div className="fixed inset-x-0 top-0 z-50 md:inset-auto md:left-1/2 md:top-16 md:-translate-x-1/2 md:w-[560px]">
        <div className="bg-background md:rounded-2xl border-b md:border border-border/60 md:shadow-2xl overflow-hidden"
          style={{ maxHeight: 'min(85dvh, 600px)' }}>

          {/* Input row */}
          <div className="flex items-center gap-3 px-4 border-b border-border/60"
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: '0.75rem' }}>
            {isSearching
              ? <Loader2 className="w-5 h-5 text-muted-foreground shrink-0 animate-spin" />
              : <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            }
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search notes, content, notebooks…"
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/60"
            />
            {query ? (
              <button
                onClick={() => setQuery('')}
                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 touch-manipulation"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 touch-manipulation px-1 py-0.5"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Results */}
          <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 'calc(min(85dvh, 600px) - 60px)' }}>

            {/* Hint state */}
            {query.length < 2 && (
              <div className="flex flex-col items-center gap-3 py-14 text-muted-foreground">
                <Search className="w-8 h-8 opacity-15" />
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground/50">Search your notes</p>
                  <p className="text-xs">Titles, content and notebooks</p>
                </div>
              </div>
            )}

            {/* No results */}
            {query.length >= 2 && !isSearching && !hasResults && (
              <div className="flex flex-col items-center gap-3 py-14 text-muted-foreground">
                <FileX className="w-8 h-8 opacity-15" />
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground/50">No results</p>
                  <p className="text-xs">Nothing found for &ldquo;{query}&rdquo;</p>
                </div>
              </div>
            )}

            {/* Notebook results */}
            {notebookResults.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-2">
                  Notebooks
                </p>
                {notebookResults.map(r => (
                  <button
                    key={r.notebook.id}
                    onClick={() => handleNotebookSelect(r.notebook.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent active:bg-accent/80 transition-colors touch-manipulation"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50">
                      <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{highlight(r.notebook.name, query)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.noteCount} {r.noteCount === 1 ? 'note' : 'notes'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Separator */}
            {notebookResults.length > 0 && noteResults.length > 0 && (
              <div className="h-px bg-border/50 mx-4 my-1" />
            )}

            {/* Note results */}
            {noteResults.length > 0 && (
              <div>
                {notebookResults.length > 0 && (
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-2">
                    Notes
                  </p>
                )}
                {noteResults.map(r => (
                  <button
                    key={r.note.id}
                    onClick={() => handleNoteSelect(r.note.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent active:bg-accent/80 transition-colors touch-manipulation border-b border-border/30 last:border-0"
                  >
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 justify-between">
                        <span className="font-medium text-sm truncate">{highlight(r.note.title || 'Untitled', query)}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {r.matchType === 'title' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">title</span>
                          )}
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />{timeAgo(r.note.updatedAt)}
                          </span>
                        </div>
                      </div>
                      {r.notebookName && (
                        <p className="text-[11px] text-muted-foreground/60 leading-none">{r.notebookName}</p>
                      )}
                      {r.matchType === 'body' && r.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed pt-0.5">
                          {highlight(r.excerpt, query)}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Bottom safe area spacer on mobile */}
            <div style={{ height: 'env(safe-area-inset-bottom)' }} />
          </div>
        </div>
      </div>
    </>
  )
}
