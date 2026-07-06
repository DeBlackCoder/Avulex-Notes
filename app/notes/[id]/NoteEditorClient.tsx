'use client'
import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useNote, useUpdateNote } from '@/hooks/useNotes'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft, MoreHorizontal, Star, StarOff, Pin, PinOff,
  Archive, ArchiveRestore, Trash2, Copy, Clock, Sparkles,
  Download, CheckCircle2, Loader2, Zap, MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, generateId, truncateTitle, wordCount } from '@/lib/utils'
import { getDB } from '@/lib/db'
import type { SessionPayload } from '@/lib/session'
import type { LocalNote } from '@/lib/db'
import type { EditorHandle } from '@/components/editor/RichTextEditor'

const RichTextEditor = dynamic(
  () => import('@/components/editor/RichTextEditor').then(m => m.RichTextEditor),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div> }
)
const AIPanel = dynamic(
  () => import('@/components/ai/AIPanel').then(m => m.AIPanel),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div> }
)
const AvaChat = dynamic(
  () => import('@/components/ai/AvaChat').then(m => m.AvaChat),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div> }
)

interface Props { noteId: string; user: SessionPayload }

export function NoteEditorClient({ noteId, user }: Props) {
  const router = useRouter()
  const { data: note, isLoading } = useNote(noteId)
  const updateNote = useUpdateNote()

  // Editor ref — gives us direct insert/replace commands
  const editorRef = useRef<EditorHandle>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [plainText, setPlainText] = useState('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyEntries, setHistoryEntries] = useState<Array<{ _id: string; savedAt: string }>>([])
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [aiMode, setAiMode] = useState<'actions' | 'chat'>('actions')
  const initialized = useRef(false)

  if (note && !initialized.current) {
    setTitle(note.title)
    setContent(note.content)
    setPlainText(note.content)
    initialized.current = true
  }

  const save = useCallback(async (t: string, c: string, pt: string) => {
    setSaveStatus('saving')
    try {
      await updateNote.mutateAsync({
        id: noteId,
        changes: { title: t, content: c, wordCount: wordCount(pt), synced: false, updatedAt: Date.now() },
      })
      setSaveStatus('saved')
    } catch {
      setSaveStatus('unsaved')
      toast.error('Auto-save failed')
    }
  }, [noteId, updateNote])

  const handleContentChange = useCallback((json: string, text: string) => {
    setContent(json)
    setPlainText(text)
  }, [])

  const handleSave = useCallback(() => {
    save(title, content, plainText)
  }, [title, content, plainText, save])

  const toggle = async (field: keyof LocalNote, val: unknown, msg: string) => {
    await updateNote.mutateAsync({ id: noteId, changes: { [field]: val } as Partial<LocalNote> })
    toast.success(msg)
  }

  const handleTrash = async () => {
    await updateNote.mutateAsync({ id: noteId, changes: { isTrashed: true, trashedAt: Date.now() } })
    toast.success('Moved to Trash')
    router.back()
  }

  const handleDuplicate = async () => {
    if (!note) return
    const db = getDB()
    const newNote = { ...note, id: generateId(), title: truncateTitle(note.title, ' (Copy)'), createdAt: Date.now(), updatedAt: Date.now(), synced: false }
    await db.notes.add(newNote)
    toast.success('Duplicated')
    router.push(`/notes/${newNote.id}`)
  }

  const openHistory = async () => {
    const res = await fetch(`/api/version-history/${noteId}`)
    const data = await res.json()
    setHistoryEntries(data.entries || [])
    setHistoryOpen(true)
  }

  const handleExport = (format: 'md' | 'txt') => {
    const blob = format === 'md'
      ? new Blob([`# ${title}\n\n${plainText}`], { type: 'text/markdown' })
      : new Blob([plainText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${title || 'note'}.${format}`; a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported as ${format.toUpperCase()}`)
  }

  /**
   * AI apply — called from AIPanel with the result text.
   * mode:
   *   'replace' — replace entire note content
   *   'insert'  — insert at cursor / append (default)
   *   'title'   — set as note title
   */
  const handleAIApply = useCallback((text: string, mode: 'replace' | 'insert' | 'title' = 'insert') => {
    if (mode === 'title') {
      const t = text.slice(0, 255)
      setTitle(t)
      save(t, content, plainText)
      toast.success('Title updated')
      return
    }
    if (mode === 'replace') {
      editorRef.current?.replaceContent(text)
      toast.success('Note content replaced')
    } else {
      editorRef.current?.insertAtCursor(text)
      toast.success('Inserted into note')
    }
    // Trigger save after AI applies content
    setTimeout(() => {
      const newJson = editorRef.current?.getJSON() ?? content
      const newText = editorRef.current?.getPlainText() ?? plainText
      setContent(newJson)
      setPlainText(newText)
      save(title, newJson, newText)
    }, 100)
  }, [content, plainText, title, save])

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  if (!note) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <p className="text-muted-foreground">Note not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>Back</Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex h-full overflow-hidden">

        {/* Main editor */}
        <div className="flex flex-col flex-1 min-w-0 h-full">

          {/* Top bar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background/95 backdrop-blur-sm shrink-0">
            <button onClick={() => router.back()} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>

            <Input
              value={title}
              onChange={e => { setTitle(e.target.value); setSaveStatus('unsaved') }}
              onBlur={() => save(title, content, plainText)}
              placeholder="Untitled"
              className="flex-1 border-0 shadow-none focus-visible:ring-0 font-semibold text-base bg-transparent px-1"
              maxLength={255}
            />

            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              {saveStatus === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saveStatus === 'saved' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
            </div>

            {/* AI button — always visible */}
            <button
              onClick={() => setAiPanelOpen(v => !v)}
              className={cn(
                'flex items-center gap-1.5 h-8 px-2.5 rounded-xl text-xs font-medium transition-colors shrink-0',
                aiPanelOpen
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-primary/30 text-primary hover:bg-primary/5'
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => toggle('isFavorite', !note.isFavorite, note.isFavorite ? 'Removed from favorites' : 'Favorited')}>
                  {note.isFavorite ? <StarOff className="w-4 h-4 mr-2" /> : <Star className="w-4 h-4 mr-2" />}
                  {note.isFavorite ? 'Unfavorite' : 'Favorite'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggle('isPinned', !note.isPinned, note.isPinned ? 'Unpinned' : 'Pinned')}>
                  {note.isPinned ? <PinOff className="w-4 h-4 mr-2" /> : <Pin className="w-4 h-4 mr-2" />}
                  {note.isPinned ? 'Unpin' : 'Pin'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}><Copy className="w-4 h-4 mr-2" /> Duplicate</DropdownMenuItem>
                <DropdownMenuItem onClick={openHistory}><Clock className="w-4 h-4 mr-2" /> Version History</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('md')}><Download className="w-4 h-4 mr-2" /> Export Markdown</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('txt')}><Download className="w-4 h-4 mr-2" /> Export TXT</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toggle('isArchived', !note.isArchived, note.isArchived ? 'Unarchived' : 'Archived')}>
                  {note.isArchived ? <ArchiveRestore className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
                  {note.isArchived ? 'Unarchive' : 'Archive'}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={handleTrash}>
                  <Trash2 className="w-4 h-4 mr-2" /> Move to Trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <RichTextEditor
              ref={editorRef}
              content={content}
              onChange={handleContentChange}
              onSave={handleSave}
              className="h-full"
            />
          </div>
        </div>

        {/* AI Panel — desktop side panel */}
        {aiPanelOpen && (
          <>
            <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setAiPanelOpen(false)} />

            {/* Desktop */}
            <div className="hidden md:flex md:w-80 md:border-l md:border-border md:flex-col md:shrink-0 bg-background z-40">
              <AIPanelTabs
                plainText={plainText}
                title={title}
                aiMode={aiMode}
                setAiMode={setAiMode}
                onApply={handleAIApply}
                onClose={() => setAiPanelOpen(false)}
              />
            </div>

            {/* Mobile bottom sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background rounded-t-3xl border-t border-border shadow-2xl"
              style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div className="w-10 h-1 bg-muted rounded-full mx-auto mt-3 mb-0 shrink-0" />
              <AIPanelTabs
                plainText={plainText}
                title={title}
                aiMode={aiMode}
                setAiMode={setAiMode}
                onApply={handleAIApply}
                onClose={() => setAiPanelOpen(false)}
              />
            </div>
          </>
        )}
      </div>

      {/* Version History */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Clock className="w-4 h-4" /> Version History</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            {historyEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No version history yet</p>
            ) : (
              <div className="space-y-1">
                {historyEntries.map(entry => (
                  <button key={entry._id}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-accent text-sm text-left"
                    onClick={() => { toast.success('Version restored'); setHistoryOpen(false) }}>
                    <span>{new Date(entry.savedAt).toLocaleString()}</span>
                    <Badge variant="outline" className="text-xs">Restore</Badge>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}

// ── AI Panel tabs (Actions / Chat) ──────────────────────────────────────────
function AIPanelTabs({
  plainText, title, aiMode, setAiMode, onApply, onClose,
}: {
  plainText: string
  title: string
  aiMode: 'actions' | 'chat'
  setAiMode: (m: 'actions' | 'chat') => void
  onApply: (text: string, mode?: 'replace' | 'insert' | 'title') => void
  onClose: () => void
}) {
  return (
    <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
      {/* Tab bar */}
      <div className="flex gap-1 p-2 border-b border-border shrink-0">
        <button
          onClick={() => setAiMode('actions')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-2 rounded-xl transition-colors',
            aiMode === 'actions' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent text-muted-foreground'
          )}
        >
          <Zap className="w-3.5 h-3.5" />
          Actions
        </button>
        <button
          onClick={() => setAiMode('chat')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-2 rounded-xl transition-colors',
            aiMode === 'chat' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent text-muted-foreground'
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Chat with Ava
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {aiMode === 'actions'
          ? <AIPanel content={plainText} noteTitle={title} onApply={onApply} onClose={onClose} />
          : <AvaChat
              noteContext={plainText}
              noteTitle={title}
              onClose={onClose}
              onEditNote={(text, mode) => {
                // Map AvaChat's 'replace'|'insert'|'append' to AIPanel's apply modes
                onApply(text, mode === 'replace' ? 'replace' : mode === 'append' ? 'insert' : 'insert')
              }}
              onRenameNote={(newTitle) => onApply(newTitle, 'title')}
            />
        }
      </div>
    </div>
  )
}
