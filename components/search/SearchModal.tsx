'use client'
import { useSearch } from '@/hooks/useSearch'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Search } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
}

export function SearchModal({ open, onClose }: Props) {
  const { query, setQuery, results, isSearching } = useSearch()
  const router = useRouter()

  const handleSelect = (noteId: string) => {
    router.push(`/notes/${noteId}`)
    onClose()
    setQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setQuery('') } }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search notes…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0 p-0 text-base"
            autoFocus
          />
        </div>

        <ScrollArea className="max-h-[60vh]">
          {query.length >= 2 && !isSearching && results.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <FileText className="w-8 h-8 opacity-30" />
              <p className="text-sm">No notes found for "{query}"</p>
            </div>
          )}

          {results.map(({ note, excerpt, matchType }) => (
            <button
              key={note.id}
              onClick={() => handleSelect(note.id)}
              className="w-full flex flex-col gap-1 px-4 py-3 text-left hover:bg-accent transition-colors border-b border-border/50 last:border-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">{note.title || 'Untitled'}</span>
                <span className="text-xs text-muted-foreground shrink-0">{timeAgo(note.updatedAt)}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{excerpt}</p>
            </button>
          ))}

          {query.length < 2 && (
            <p className="text-xs text-muted-foreground text-center py-6">Type at least 2 characters to search</p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
