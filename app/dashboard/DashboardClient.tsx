'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDB, type LocalNote } from '@/lib/db'
import { AppShell } from '@/components/layout/AppShell'
import { NoteCard } from '@/components/notes/NoteCard'
import { Button } from '@/components/ui/button'
import { Plus, Pin, Star, Clock } from 'lucide-react'
import type { SessionPayload } from '@/lib/session'
import { useCreateNote } from '@/hooks/useNotes'
import { useNotebooks } from '@/hooks/useNotebooks'
import { toast } from 'sonner'

interface Props { user: SessionPayload }

function EmptySection({ label }: { label: string }) {
  return (
    <p className="text-sm text-muted-foreground py-5 text-center border border-dashed border-border/50 rounded-xl">
      {label}
    </p>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 min-w-[80px] bg-muted/50 rounded-lg px-4 py-3">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-2xl font-medium">{value}</p>
    </div>
  )
}

export function DashboardClient({ user }: Props) {
  const router = useRouter()
  const [recent, setRecent] = useState<LocalNote[]>([])
  const [pinned, setPinned] = useState<LocalNote[]>([])
  const [favorites, setFavorites] = useState<LocalNote[]>([])
  const { data: notebooks = [] } = useNotebooks()
  const createNote = useCreateNote()
  const [greeting, setGreeting] = useState('morning')

  useEffect(() => {
    setGreeting(getGreeting())
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

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-medium tracking-tight">
              Good {greeting}, {user.displayName?.split(' ')[0]}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Your notes at a glance</p>
          </div>
          <Button onClick={handleNewNote} size="sm" className="gap-1.5 shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New note</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-3 flex-wrap">
          <StatCard label="Notes" value={totalNotes} />
          <StatCard label="Notebooks" value={notebooks.length} />
          <StatCard label="Pinned" value={pinned.length} />
          <StatCard label="Favorites" value={favorites.length} />
        </div>

        {/* Pinned */}
        <Section icon={<Pin className="w-3.5 h-3.5" />} label="Pinned">
          {pinned.length === 0
            ? <EmptySection label="No pinned notes yet" />
            : <NoteGrid notes={pinned} />
          }
        </Section>

        {/* Favorites */}
        <Section icon={<Star className="w-3.5 h-3.5" />} label="Favorites">
          {favorites.length === 0
            ? <EmptySection label="No favorite notes yet" />
            : <NoteGrid notes={favorites} />
          }
        </Section>

        {/* Recent */}
        <Section
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Recent"
          badge={totalNotes > 0 ? `${Math.min(10, totalNotes)} of ${totalNotes}` : undefined}
        >
          {recent.length === 0
            ? <EmptySection label="No notes yet — create your first!" />
            : <NoteGrid notes={recent} />
          }
        </Section>

      </div>
    </AppShell>
  )
}

function Section({
  icon, label, badge, children
}: {
  icon: React.ReactNode
  label: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          {icon}
          {label}
        </div>
        {badge && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

function NoteGrid({ notes }: { notes: LocalNote[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {notes.map(n => <NoteCard key={n.id} note={n} />)}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}