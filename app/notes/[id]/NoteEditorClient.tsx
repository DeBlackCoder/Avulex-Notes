'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

// Import directly — NOT via next/dynamic so forwardRef works
// The RichTextEditor has its own mounted guard for SSR safety
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { AIPanel } from '@/components/ai/AIPanel'
import { AvaChat } from '@/components/ai/AvaChat'

interface Props { noteId: string; user: SessionPayload }

export function NoteEditorClient({ noteId, user }: Props) {
  const router = useRouter()
  const { data: note, isLoading } = useNote(noteId)
  const updateNote = useUpdateNote()

  // Direct ref to editor — works because we import directly (no dynamic wrapper)
  const editorRef = useRef<EditorHandle>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [plainText, setPlainText] = useState('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyEntries, setHistoryEntries] = useState<Array<{ _id: string; savedAt: string }>>([])
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [aiMode, setAiMode] = useState<'actions' | 'chat'>('actions')
  const [mounted, setMounted] = useState(false)
  const initialized = useRef(false)

  useEffect(() => { setMounted(true) }, [])

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
   * AI apply — receives text from AIPanel or AvaChat and applies it to the editor.
   * Uses editorRef.current directly — works because RichTextEditor is a direct import with forwardRef.
   */
  const handleAIApply = useCallback((text: string, mode: 'replace' | 'insert' | 'title' = 'insert') => {
    console.log('[AI Apply]', { mode, textLength: text.length, editorRef: !!editorRef.current })

    if (mode === 'title') {
      const t = text.slice(0, 255)
      setTitle(t)
      save(t, content, plainText)
      toast.success('Title updated')
      return
    }

    if (!editorRef.current) {
      toast.error('Editor not ready — try again')
      return
    }

    if (mode === 'replace') {
      editorRef.current.replaceContent(text)
      toast.success('Note rewritten by AI')
    } else {
      editorRef.current.appendContent(text)
      toast.success('AI content added to note')
    }

    // Read back the new editor state and save
    setTimeout(() => {
      if (!editorRef.current) return
      const newJson = editorRef.current.getJSON()
      const newText = editorRef.current.getPlainText()
      setContent(newJson)
      setPlainText(newText)
      save(title, newJson, newText)
    }, 200)
  }, [content, plainText, title, save])

  if (isLoading || !mounted) {
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

          {/* Editor — direct import so ref forwarding works */}
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

        {/* AI Panel */}
        {aiPanelOpen && (
          <>
            <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setAiPanelOpen(false)} />

            {/* Desktop side panel */}
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
            <div
              className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background border-t border-border shadow-2xl transition-all duration-300"
              style={{
                height: 'var(--ai-sheet-height, 85dvh)',
                borderRadius: 'var(--ai-sheet-radius, 24px 24px 0 0)',
                display: 'flex',
                flexDirection: 'column',
              }}
              id="ai-mobile-sheet"
            >
              <div className="w-10 h-1 bg-muted rounded-full mx-auto mt-3 mb-0 shrink-0" />
              <AIPanelTabs
                plainText={plainText}
                title={title}
                aiMode={aiMode}
                setAiMode={setAiMode}
                onApply={handleAIApply}
                onClose={() => setAiPanelOpen(false)}
                onResultChange={(hasResult) => {
                  const sheet = document.getElementById('ai-mobile-sheet')
                  if (sheet) {
                    sheet.style.setProperty('--ai-sheet-height', hasResult ? '100dvh' : '85dvh')
                    sheet.style.setProperty('--ai-sheet-radius', hasResult ? '0' : '24px 24px 0 0')
                    sheet.style.height = hasResult ? '100dvh' : '85dvh'
                    sheet.style.borderRadius = hasResult ? '0' : '24px 24px 0 0'
                  }
                }}
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

function AIPanelTabs({
  plainText, title, aiMode, setAiMode, onApply, onClose, onResultChange,
}: {
  plainText: string
  title: string
  aiMode: 'actions' | 'chat'
  setAiMode: (m: 'actions' | 'chat') => void
  onApply: (text: string, mode?: 'replace' | 'insert' | 'title') => void
  onClose: () => void
  onResultChange?: (hasResult: boolean) => void
}) {
  return (
    <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
      <div className="flex gap-1 p-2 border-b border-border shrink-0">
        <button
          onClick={() => setAiMode('actions')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-2 rounded-xl transition-colors',
            aiMode === 'actions' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent text-muted-foreground'
          )}
        >
          <Zap className="w-3.5 h-3.5" /> Actions
        </button>
        <button
          onClick={() => setAiMode('chat')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-2 rounded-xl transition-colors',
            aiMode === 'chat' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent text-muted-foreground'
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" /> Chat with Ava
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {aiMode === 'actions'
          ? <AIPanel content={plainText} noteTitle={title} onApply={onApply} onClose={onClose} onResultChange={onResultChange} />
          : <AvaChat
              noteContext={plainText}
              noteTitle={title}
              onClose={onClose}
              onEditNote={(text, mode) => onApply(text, mode === 'replace' ? 'replace' : 'insert')}
              onRenameNote={(newTitle) => onApply(newTitle, 'title')}
            />
        }
      </div>
    </div>
  )
}
