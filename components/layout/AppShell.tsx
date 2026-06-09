'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { useAuth } from '@/contexts/AuthContext'
import { useSync } from '@/hooks/useSync'
import { SyncStatusBadge } from '@/components/sync-status'
import { Button } from '@/components/ui/button'
import { Menu, Search, X, LayoutDashboard, Star, Archive, Trash2, Clock, Plus, Sparkles, MessageSquare } from 'lucide-react'
import { SearchModal } from '@/components/search/SearchModal'
import { cn } from '@/lib/utils'
import { useCreateNote } from '@/hooks/useNotes'
import { useNotebooks } from '@/hooks/useNotebooks'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

const AvaChat = dynamic(() => import('@/components/ai/AvaChat').then(m => m.AvaChat), { ssr: false })

interface Props {
  children: React.ReactNode
  workspaceId?: string
}

const BOTTOM_NAV = [
  { icon: LayoutDashboard, label: 'Home',     href: '/dashboard' },
  { icon: Star,           label: 'Favorites', href: '/favorites' },
  { icon: MessageSquare,  label: 'Ava AI',    href: '/chat' },
  { icon: Archive,        label: 'Archive',   href: '/archive' },
  { icon: Clock,          label: 'Activity',  href: '/activity' },
]

export function AppShell({ children, workspaceId = '' }: Props) {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  const { status, lastSync } = useSync(user?.userId ?? null)
  const createNote = useCreateNote()
  const { data: notebooks = [] } = useNotebooks()

  // On desktop, sidebar is open by default
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    setIsDesktop(mq.matches)
    setSidebarOpen(mq.matches)
    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches)
      setSidebarOpen(e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Ctrl+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (!isDesktop) setSidebarOpen(false)
  }, [pathname, isDesktop])

  const handleNewNote = async () => {
    const nb = notebooks[0]
    if (!nb) { toast.error('Create a notebook first'); return }
    const note = await createNote.mutateAsync({ notebookId: nb.id, title: 'Untitled' })
    router.push(`/notes/${note.id}`)
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* Mobile overlay */}
      {!isDesktop && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — slides in on mobile, fixed on desktop */}
      <div className={cn(
        'fixed md:relative inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out',
        'md:translate-x-0 md:flex md:flex-shrink-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <Sidebar
          workspaceId={workspaceId}
          onSelectNotebook={(id) => { setSelectedNotebook(id); if (!isDesktop) setSidebarOpen(false) }}
          selectedNotebook={selectedNotebook}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* Top header */}
        <header className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-20 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 -ml-1"
            onClick={() => setSidebarOpen(v => !v)}
          >
            {sidebarOpen && !isDesktop ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          {/* Page title from pathname */}
          <span className="font-semibold text-sm truncate flex-1 md:hidden">
            {getPageTitle(pathname)}
          </span>

          <div className="hidden md:flex flex-1" />

          {/* Search — full button on desktop, icon on mobile */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-muted-foreground text-xs hidden md:flex"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="w-3.5 h-3.5" />
            Search notes…
            <kbd className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </Button>

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSearchOpen(true)}>
            <Search className="w-5 h-5" />
          </Button>

          {/* Sync status — desktop only */}
          <SyncStatusBadge status={status} lastSync={lastSync} className="hidden lg:flex" />

          {/* Ask AI button — desktop */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 hidden md:flex text-xs h-8 rounded-xl border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => setAskOpen(true)}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask AI
          </Button>

          {/* New note FAB on mobile header */}
          <Button size="icon" className="md:hidden w-8 h-8 rounded-full" onClick={handleNewNote}>
            <Plus className="w-4 h-4" />
          </Button>
        </header>

        {/* Page content — with bottom padding for mobile nav */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 md:hidden bg-background/95 backdrop-blur-sm border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {BOTTOM_NAV.map(({ icon: Icon, label, href }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            const isAva = href === '/chat'
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-0',
                  isAva
                    ? 'px-2'
                    : active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {isAva ? (
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md',
                    active
                      ? 'bg-primary text-primary-foreground scale-110'
                      : 'bg-gradient-to-br from-violet-500 to-blue-500 text-white'
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                ) : (
                  <>
                    <Icon className={cn('w-5 h-5', active && 'fill-primary/20')} />
                    <span className="text-[10px] font-medium leading-none">{label}</span>
                  </>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Ask Notes AI panel — slide-in from right */}
      {askOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setAskOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-96 shadow-2xl border-l border-border">
            <AvaChat onClose={() => setAskOpen(false)} />
          </div>
        </>
      )}
    </div>
  )
}

function getPageTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname.startsWith('/notes/')) return 'Note'
  if (pathname === '/notes') return 'Notes'
  if (pathname === '/favorites') return 'Favorites'
  if (pathname === '/archive') return 'Archive'
  if (pathname === '/trash') return 'Trash'
  if (pathname === '/activity') return 'Activity'
  if (pathname === '/devices') return 'Devices'
  if (pathname === '/settings') return 'Settings'
  return 'Avulex Notes'
}
