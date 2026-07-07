'use client'
import { useSearch, type NoteSearchResult, type NotebookSearchResult } from '@/hooks/useSearch'
import { useRouter } from 'next/navigation'
import { useRef, useEffect, useCallback } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Notebook, Search, FileX } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
}

function highlight(text: string, query: string) {
  if (!query || query.length < 2) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 rounded-sm px-px">{part}</mark>
          : part
      )}
    </>
  )
}

export function SearchModal({ open, onClose }: Props) {
  const { query, setQuery, results, isSearching } = useSearch()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

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
  const hasResults = results.length > 0

  // Arrow-key navigation between rows
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const first = resultsRef.current?.querySelector<HTMLElement>('[data-result-row]')
      first?.focus()
    }
  }, [])

  const handleRowKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    const rows = [...(resultsRef.current?.querySelectorAll<HTMLElement>('[data-result-row]') ?? [])]
    const idx = rows.indexOf(e.currentTarget)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      rows[idx + 1]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (idx === 0) inputRef.current?.focus()
      else rows[idx - 1]?.focus()
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl border border-border/60">

        {/* ── Search input ── */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            placeholder="Search notes, content, notebooks…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="border-0 shadow-none focus-visible:ring-0 p-0 text-[15px] bg-transparent"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 px-1.5 py-0.5 rounded hover:bg-accent"
            >
              Clear
            </button>
          )}
          <kbd className="hidden sm:inline-flex text-[11px] text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5 font-mono shrink-0">
            Esc
          </kbd>
        </div>

        {/* ── Results ── */}
        <ScrollArea>
          <div ref={resultsRef} className="max-h-[min(420px,65vh)]">

            {/* Empty / hint */}
            {query.length < 2 && (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Search className="w-7 h-7 opacity-20" />
                <p className="text-sm">Search notes, titles, and notebooks</p>
              </div>
            )}

            {query.length >= 2 && !isSearching && !hasResults && (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <FileX className="w-7 h-7 opacity-20" />
                <p className="text-sm">No results for &ldquo;{query}&rdquo;</p>
              </div>
            )}

            {/* Notebook results */}
            {notebookResults.length > 0 && (
              <section>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-1.5">
                  Notebooks
                </p>
                {notebookResults.map(r => (
                  <button
                    key={r.notebook.id}
                    data-result-row
                    onKeyDown={handleRowKeyDown}
                    onClick={() => handleNotebookSelect(r.notebook.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none transition-colors border-b border-border/40 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
                      <Notebook className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {highlight(r.notebook.name, query)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.noteCount} {r.noteCount === 1 ? 'note' : 'notes'}
                      </p>
                    </div>
                  </button>
                ))}
              </section>
            )}

            {/* Divider between sections */}
            {notebookResults.length > 0 && noteResults.length > 0 && (
              <div className="h-px bg-border mx-4 my-0.5" />
            )}

            {/* Note results */}
            {noteResults.length > 0 && (
              <section>
                {notebookResults.length > 0 && (
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-1.5">
                    Notes
                  </p>
                )}
                {noteResults.map(r => (
                  <button
                    key={r.note.id}
                    data-result-row
                    onKeyDown={handleRowKeyDown}
                    onClick={() => handleNoteSelect(r.note.id)}
                    className="w-full flex flex-col gap-1 px-4 py-3 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none transition-colors border-b border-border/40 last:border-0"
                  >
                    {/* Title row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {highlight(r.note.title || 'Untitled', query)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {r.matchType === 'title' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium leading-none">
                            title
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {timeAgo(r.note.updatedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Notebook name */}
                    {r.notebookName && (
                      <p className="text-[11px] text-muted-foreground/70 ml-[22px] leading-none">
                        {r.notebookName}
                      </p>
                    )}

                    {/* Excerpt with highlight */}
                    {r.matchType === 'body' && r.excerpt && (
                      <p className="text-xs text-muted-foreground line-clamp-2 ml-[22px] mt-0.5 leading-relaxed">
                        {highlight(r.excerpt, query)}
                      </p>
                    )}
                  </button>
                ))}
              </section>
            )}
          </div>
        </ScrollArea>

        {/* ── Footer hints ── */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border bg-muted/40">
          <FooterHint keys={['↑', '↓']} label="navigate" />
          <FooterHint keys={['↵']} label="open" />
          <FooterHint keys={['⌘', 'K']} label="search" />
        </div>

      </DialogContent>
    </Dialog>
  )
}

function FooterHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-0.5">
        {keys.map(k => (
          <kbd key={k} className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-mono bg-background border border-border rounded">
            {k}
          </kbd>
        ))}
      </span>
      <span>{label}</span>
    </span>
  )
}