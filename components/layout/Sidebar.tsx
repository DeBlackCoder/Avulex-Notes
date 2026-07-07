'use client'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useNotebooks, useCreateNotebook, useDeleteNotebook, useUpdateNotebook } from '@/hooks/useNotebooks'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  LayoutDashboard, BookOpen, Star, Archive, Trash2,
  Plus, Settings, LogOut, MoreHorizontal, Pencil, Trash,
  Clock, Monitor, MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/theme-toggle'

interface SidebarProps {
  workspaceId: string
  onSelectNotebook: (id: string) => void
  selectedNotebook: string | null
  onClose?: () => void
}

export function Sidebar({ workspaceId, onSelectNotebook, selectedNotebook, onClose }: SidebarProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { data: notebooks = [] } = useNotebooks()
  const createNotebook = useCreateNotebook()
  const deleteNotebook = useDeleteNotebook()
  const updateNotebook = useUpdateNotebook()

  const [createOpen, setCreateOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null)
  const [nbName, setNbName] = useState('')

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard',   href: '/dashboard' },
    { icon: Star,            label: 'Favorites',   href: '/favorites' },
    { icon: MessageSquare,   label: 'Ava Chats',   href: '/conversations' },
    { icon: Archive,         label: 'Archive',     href: '/archive' },
    { icon: Trash2,          label: 'Trash',       href: '/trash' },
    { icon: Clock,           label: 'Activity',    href: '/activity' },
    { icon: Monitor,         label: 'Devices',     href: '/devices' },
  ]

  const navigate = (href: string) => {
    router.push(href)
    onClose?.()
  }

  const handleCreate = async () => {
    if (!nbName.trim()) return
    try {
      await createNotebook.mutateAsync({ name: nbName.trim(), workspaceId })
      setNbName(''); setCreateOpen(false)
      toast.success('Notebook created')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create')
    }
  }

  const handleRename = async () => {
    if (!renameTarget || !nbName.trim()) return
    try {
      await updateNotebook.mutateAsync({ id: renameTarget.id, name: nbName.trim() })
      setRenameOpen(false)
      toast.success('Renamed')
    } catch { toast.error('Failed to rename') }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? All notes will move to Trash.`)) return
    await deleteNotebook.mutateAsync(id)
    toast.success('Notebook deleted')
  }

  return (
    <>
      <aside className="w-72 md:w-64 flex flex-col h-full bg-sidebar border-r border-border shadow-2xl md:shadow-none">

        {/* Brand header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border shrink-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shadow-md shadow-violet-500/20">
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden>
              <path d="M8 24L16 8L24 24" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10.5 19h11" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm leading-none">Avulex Notes</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-none">Your notes, everywhere</p>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="py-3 px-2">

            {/* Navigation items */}
            <div className="mb-1 space-y-0.5">
              {navItems.map(({ icon: Icon, label, href }) => {
                const active = pathname === href
                return (
                  <button
                    key={href}
                    onClick={() => navigate(href)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                      'touch-manipulation active:scale-[0.98]',
                      active
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <Icon className={cn('w-4 h-4 shrink-0', active && 'text-primary')} />
                    {label}
                  </button>
                )
              })}
            </div>

            <Separator className="my-3" />

            {/* Notebooks section */}
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Notebooks
              </span>
              <button
                onClick={() => { setNbName(''); setCreateOpen(true) }}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-accent active:bg-accent/80 transition-all duration-150 active:scale-[0.95] text-muted-foreground hover:text-foreground touch-manipulation"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {notebooks.length === 0 && (
              <button
                onClick={() => { setNbName(''); setCreateOpen(true) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground border border-dashed border-border hover:border-primary/30 hover:bg-accent/50 transition-all duration-150 active:scale-[0.98] touch-manipulation"
              >
                <Plus className="w-3.5 h-3.5" />
                New notebook
              </button>
            )}

            <div className="space-y-0.5">
              {notebooks.map(nb => (
                <div key={nb.id} className="group flex items-center gap-1">
                  <button
                    onClick={() => {
                      onSelectNotebook(nb.id)
                      navigate(`/notes?notebook=${nb.id}`)
                    }}
                    className={cn(
                      'flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 text-left',
                      'touch-manipulation active:scale-[0.98]',
                      selectedNotebook === nb.id
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{nb.name}</span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150',
                      'opacity-0 group-hover:opacity-100 hover:bg-accent active:bg-accent/80 text-muted-foreground',
                      'touch-manipulation active:scale-[0.95]'
                    )}>
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => {
                        setRenameTarget({ id: nb.id, name: nb.name })
                        setNbName(nb.name)
                        setRenameOpen(true)
                      }}>
                        <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDelete(nb.id, nb.name)} className="text-destructive">
                        <Trash className="w-3.5 h-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* User footer */}
        <div className="border-t border-border p-3 shrink-0 space-y-2">
          {/* Theme toggle — visible in sidebar (mobile gets it here, desktop has it in header) */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground font-medium">Appearance</span>
            <ThemeToggle variant="segmented" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-3 rounded-2xl p-2.5 hover:bg-accent active:bg-accent/80 transition-all duration-150 text-left active:scale-[0.98] touch-manipulation">
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-violet-500 to-blue-500 text-white">
                  {user?.displayName?.[0] ?? 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{user?.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-52 mb-1">
              <DropdownMenuItem onClick={() => { router.push('/settings'); onClose?.() }}>
                <Settings className="w-4 h-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm mx-4">
          <DialogHeader><DialogTitle>New Notebook</DialogTitle></DialogHeader>
          <Input
            placeholder="Notebook name"
            value={nbName}
            onChange={e => setNbName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            maxLength={255}
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!nbName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm mx-4">
          <DialogHeader><DialogTitle>Rename Notebook</DialogTitle></DialogHeader>
          <Input
            value={nbName}
            onChange={e => setNbName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRename()}
            maxLength={255}
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={handleRename} disabled={!nbName.trim()}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
