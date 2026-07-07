'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDB, type LocalNote } from '@/lib/db'
import { AppShell } from '@/components/layout/AppShell'
import { NoteCard } from '@/components/notes/NoteCard'
import { Plus, Pin, Star, Clock, BookOpen, FileText, Sparkles } from 'lucide-react'
import type { SessionPayload } from '@/lib/session'
import { useCreateNote, useUpdateNote } from '@/hooks/useNotes'
import { useNotebooks } from '@/hooks/useNotebooks'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { CreateNoteModal } from '@/components/ai/CreateNoteModal'

interface Props { user: SessionPayload }

type TabKey = 'recent' | 'pinned' | 'favorites'

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'recent', label: 'Recent', icon: Clock },
  { key: 'pinned', label: 'Pinned', icon: Pin },
  { key: 'favorites', label: 'Favorites', icon: Star },
]

const RECENT_LIMIT = 10

function EmptyState({ label, icon: Icon }: { label: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-muted-foreground">
      <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
        <Icon className="w-6 h-6 opacity-40" />
      </div>
      <p className="text-sm">{label}</p>
    </div>
  )
}

function NoteCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/40 bg-muted/30 p-4 h-32 animate-pulse space-y-2">
      <div className="h-3 w-2/3 rounded bg-muted-foreground/15" />
      <div className="h-2.5 w-full rounded bg-muted-foreground/10" />
      <div className="h-2.5 w-4/5 rounded bg-muted-foreground/10" />
    </div>
  )
}

export function DashboardClient({ user }: Props) {
  const router = useRouter()
  const [recent, setRecent] = useState<LocalNote[]>([])
  const [pinned, setPinned] = useState<LocalNote[]>([])
  const [favorites, setFavorites] = useState<LocalNote[]>([])
  const [totalNotes, setTotalNotes] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('recent')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const { data: notebooks = [] } = useNotebooks()
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const [greeting, setGreeting] = useState('morning')
  const [today, setToday] = useState('')

  useEffect(() => {
    setGreeting(getGreeting())
    setToday(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))
    let cancelled = false
    const load = async () => {
      try {
        const db = getDB()
        const all = await db.notes.filter(n => !n.isTrashed && !n.isArchived).toArray()
        all.sort((a, b) => b.updatedAt - a.updatedAt)
        if (cancelled) return
        setTotalNotes(all.length)
        setRecent(all.slice(0, RECENT_LIMIT))
        setPinned(all.filter(n => n.isPinned))
        setFavorites(all.filter(n => n.isFavorite))
      } catch (err) {
        if (!cancelled) toast.error('Could not load your notes')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleNewNote = async () => {
    const defaultNb = notebooks[0]
    if (!defaultNb) { toast.error('Create a notebook first'); return }
    const note = await createNote.mutateAsync({ notebookId: defaultNb.id, title: 'Untitled' })
    router.push(`/notes/${note.id}`)
  }

  const handleAICreate = async (title: string, content: string) => {
    const nb = notebooks[0]
    if (!nb) { toast.error('Create a notebook first'); return }
    const note = await createNote.mutateAsync({ notebookId: nb.id, title })
    await updateNote.mutateAsync({ id: note.id, changes: { title, content, synced: false, updatedAt: Date.now() } })
    toast.success('AI note created')
    router.push(`/notes/${note.id}`)
  }

  const tabNotes: Record<TabKey, LocalNote[]> = {
    recent,
    pinned,
    favorites,
  }
  const tabEmpty: Record<TabKey, string> = {
    recent: 'No notes yet — create your first!',
    pinned: 'No pinned notes yet',
    favorites: 'No favorite notes yet',
  }
  const tabIcons: Record<TabKey, React.ElementType> = {
    recent: Clock,
    pinned: Pin,
    favorites: Star,
  }

  const firstName = user.displayName?.split(' ')[0] || 'there'

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-6">

        {/* Greeting section */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">{today || '\u00A0'}</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
              Good {greeting},
            </h1>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-primary">
              {firstName}
            </h2>
          </div>
          {/* Quick stats summary chip + actions */}
          <div className="flex flex-col items-end gap-2 shrink-0 mt-1">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-muted/50 border border-border/40">
              <FileText className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-xs font-semibold">{totalNotes}</span>
              <span className="text-xs text-muted-foreground">notes</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewNote}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-muted/50 border border-border/40 text-foreground text-xs font-semibold hover:bg-muted transition-all active:scale-[0.96]"
              >
                <Plus className="w-3.5 h-3.5" />
                New note
              </button>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-violet-500/10 to-primary/10 border border-violet-200/40 dark:border-violet-800/30 text-primary text-xs font-semibold hover:from-violet-500/20 hover:to-primary/20 transition-all touch-manipulation active:scale-[0.96]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Create
              </button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: 'Notes', value: totalNotes, icon: FileText, color: 'text-violet-500' },
            { label: 'Books', value: notebooks.length, icon: BookOpen, color: 'text-blue-500' },
            { label: 'Pinned', value: pinned.length, icon: Pin, color: 'text-amber-500' },
            { label: 'Starred', value: favorites.length, icon: Star, color: 'text-emerald-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-muted/50 rounded-2xl px-3 py-3 sm:px-4 sm:py-4 flex flex-col gap-1.5 border border-border/40">
              <Icon className={cn('w-4 h-4', color)} />
              <p className="text-xl sm:text-2xl font-bold leading-none">{isLoading ? '–' : value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-none">{label}</p>
            </div>
          ))}
        </div>

        {/* Tab pills */}
        <div role="tablist" aria-label="Note filters" className="flex gap-2 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 pb-1">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key
            const count = tabNotes[key].length
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active}
                aria-controls={`panel-${key}`}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-200 touch-manipulation active:scale-[0.95]',
                  active
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {!isLoading && count > 0 && (
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center',
                    active ? 'bg-white/20' : 'bg-muted-foreground/15'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Notes grid */}
        <div role="tabpanel" id={`panel-${activeTab}`} suppressHydrationWarning>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <NoteCardSkeleton key={i} />)}
            </div>
          ) : tabNotes[activeTab].length === 0 ? (
            <EmptyState label={tabEmpty[activeTab]} icon={tabIcons[activeTab]} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {tabNotes[activeTab].map(n => <NoteCard key={n.id} note={n} />)}
            </div>
          )}
        </div>
      </div>

      {/* FAB — fixed bottom right on mobile */}
      <button
        onClick={handleNewNote}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 z-10 sm:hidden w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center transition-all duration-150 active:scale-[0.93] touch-manipulation hover:bg-primary/90"
        aria-label="New note"
      >
        <Plus className="w-6 h-6" />
      </button>

      <CreateNoteModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleAICreate}
      />
    </AppShell>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}