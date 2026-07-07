'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { useAuth } from '@/contexts/AuthContext'
import { useSync } from '@/hooks/useSync'
import { SyncStatusBadge } from '@/components/sync-status'
import { Button } from '@/components/ui/button'
import { Menu, Search, X, LayoutDashboard, Star, Archive, Clock, Plus, Sparkles, MessageSquare } from 'lucide-react'
import { SearchModal } from '@/components/search/SearchModal'
import { cn } from '@/lib/utils'
import { useCreateNote } from '@/hooks/useNotes'
import { useNotebooks } from '@/hooks/useNotebooks'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import { ThemeToggle } from '@/components/theme-toggle'

const AvaChat = dynamic(() => import('@/components/ai/AvaChat').then(m => m.AvaChat), { ssr: false })

interface Props {
  children: React.ReactNode
  workspaceId?: string
}

const BOTTOM_NAV = [
  { icon: LayoutDashboard, label: 'Home',     href: '/dashboard' },
  { icon: Star,           label: 'Favorites', href: '/favorites' },
  { icon: MessageSquare,  label: 'Ava',       href: '/chat' },
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
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
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

        {/* Top header — 56px, proper title, search icon, new note FAB */}
        <header className="flex items-center gap-2 px-3 border-b border-border/50 bg-background/95 backdrop-blur-xl sticky top-0 z-20 shrink-0 safe-area-top h-[56px]">
          <button
            className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center hover:bg-accent active:bg-accent/80 transition-all duration-150 active:scale-[0.97] touch-manipulation -ml-1 text-foreground"
            onClick={() => setSidebarOpen(v => !v)}
          >
            {sidebarOpen && !isDesktop ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Page title — mobile only */}
          <span className="font-bold text-base truncate flex-1 md:hidden">
            {getPageTitle(pathname)}
          </span>

          <div className="hidden md:flex flex-1" />

          {/* Search — full pill on desktop, icon on mobile */}
          <button
            className="gap-2 text-muted-foreground text-xs hidden md:flex items-center h-9 px-3 rounded-xl border border-border hover:bg-accent transition-all duration-150"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="w-3.5 h-3.5" />
            Search notes…
            <kbd className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </button>

          {/* Search icon — mobile */}
          <button
            className="md:hidden w-11 h-11 rounded-xl flex items-center justify-center hover:bg-accent active:bg-accent/80 transition-all duration-150 active:scale-[0.97] touch-manipulation text-muted-foreground"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Sync status — desktop only */}
          <SyncStatusBadge status={status} lastSync={lastSync} className="hidden lg:flex" />

          {/* Theme toggle — desktop only */}
          <ThemeToggle className="hidden md:flex" />

          {/* Ask AI — desktop */}
          <button
            className="gap-1.5 hidden md:flex items-center text-xs h-9 px-3 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 transition-all duration-150 font-medium"
            onClick={() => setAskOpen(true)}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask AI
          </button>

          {/* New note button — mobile header, rounded full FAB-style */}
          <button
            className="md:hidden w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md shadow-primary/30 transition-all duration-150 active:scale-[0.92] touch-manipulation"
            onClick={handleNewNote}
          >
            <Plus className="w-4 h-4" />
          </button>
        </header>

        {/* Page content — bottom padding for mobile nav */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation — iOS tab bar style */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-20 md:hidden bg-background/85 backdrop-blur-2xl border-t border-border/50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around px-2 h-[56px]">
          {BOTTOM_NAV.map(({ icon: Icon, label, href }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            const isAva = href === '/chat'
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-2xl transition-all duration-200 min-w-0 touch-manipulation',
                  'active:scale-[0.90]',
                  !isAva && (active ? 'text-primary' : 'text-muted-foreground')
                )}
              >
                {isAva ? (
                  /* Center gradient Ava button */
                  <div className={cn(
                    'w-12 h-12 -mt-5 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg',
                    active
                      ? 'bg-primary text-primary-foreground shadow-primary/40 scale-110'
                      : 'bg-gradient-to-br from-violet-500 via-purple-500 to-blue-600 text-white shadow-violet-500/40'
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                ) : (
                  <>
                    <div className={cn(
                      'w-8 h-6 rounded-full flex items-center justify-center transition-all duration-200',
                      active && 'bg-primary/15'
                    )}>
                      <Icon className={cn('w-5 h-5 transition-all duration-200', active && 'scale-110')} />
                    </div>
                    <span className={cn(
                      'text-[10px] leading-none transition-all duration-200',
                      active ? 'font-bold' : 'font-medium'
                    )}>
                      {label}
                    </span>
                  </>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Ask AI panel — slide-in from right */}
      {askOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={() => setAskOpen(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] shadow-2xl border-l border-border transition-transform duration-300">
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
