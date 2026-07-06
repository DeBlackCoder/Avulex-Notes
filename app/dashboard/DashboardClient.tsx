'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDB, type LocalNote } from '@/lib/db'
import { AppShell } from '@/components/layout/AppShell'
import { NoteCard } from '@/components/notes/NoteCard'
import { Plus, Pin, Star, Clock, BookOpen, FileText } from 'lucide-react'
import type { SessionPayload } from '@/lib/session'
import { useCreateNote } from '@/hooks/useNotes'
import { useNotebooks } from '@/hooks/useNotebooks'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props { user: SessionPayload }

type TabKey = 'recent' | 'pinned' | 'favorites'

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'recent', label: 'Recent', icon: Clock },
  { key: 'pinned', label: 'Pinned', icon: Pin },
  { key: 'favorites', label: 'Favorites', icon: Star },
]

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

export function DashboardClient({ user }: Props) {
  const router = useRouter()
  const [recent, setRecent] = useState<LocalNote[]>([])
  const [pinned, setPinned] = useState<LocalNote[]>([])
  const [favorites, setFavorites] = useState<LocalNote[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('recent')
  const { data: notebooks = [] } = useNotebooks()
  const createNote = useCreateNote()
  const [greeting, setGreeting] = useState('morning')
  const [today, setToday] = useState('')

  useEffect(() => {
    setGreeting(getGreeting())
    setToday(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))
    const load = async () => {
      const db = getDB()
      const all = await db.notes.filter(n => !n.isTrashed && !n.isArchived).toArray()
      all.sort((a, b) => b.updatedAt - a.updatedAt)
      setRecent(all.slice(0, 10))
      setPinned(all.filter(n => n.isPinned))
      setFavorites(all.filter(n => n.isFavorite))
    }
    load()
  }, [])

  const handleNewNote = async () => {
    const defaultNb = notebooks[0]
    if (!defaultNb) { toast.error('Create a notebook first'); return }
    const note = await createNote.mutateAsync({ notebookId: defaultNb.id, title: 'Untitled' })
    router.push(`/notes/${note.id}`)
  }

  const totalNotes = recent.length

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

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-6">

        {/* Greeting section */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">{today}</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
              Good {greeting},
            </h1>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-primary">
              {user.displayName?.split(' ')[0]}
            </h2>
          </div>
          {/* Quick stats summary chip */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-muted/50 border border-border/40 shrink-0 mt-1">
            <FileText className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-xs font-semibold">{totalNotes}</span>
            <span className="text-xs text-muted-foreground">notes</span>
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
              <p className="text-xl sm:text-2xl font-bold leading-none">{value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-none">{label}</p>
            </div>
          ))}
        </div>

        {/* Tab pills with sliding indicator style */}
        <div className="flex gap-2 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 pb-1">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key
            const count = tabNotes[key].length
            return (
              <button
                key={key}
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
                {count > 0 && (
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
        {tabNotes[activeTab].length === 0 ? (
          <EmptyState label={tabEmpty[activeTab]} icon={tabIcons[activeTab]} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {tabNotes[activeTab].map(n => <NoteCard key={n.id} note={n} />)}
          </div>
        )}
      </div>

      {/* FAB — fixed bottom right on mobile */}
      <button
        onClick={handleNewNote}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 z-10 md:hidden w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center transition-all duration-150 active:scale-[0.93] touch-manipulation hover:bg-primary/90"
        aria-label="New note"
      >
        <Plus className="w-6 h-6" />
      </button>
    </AppShell>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
