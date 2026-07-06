'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import {
  MessageSquare, Plus, Pin, Trash2, Sparkles,
  ChevronRight, PinOff, Clock,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { toast } from 'sonner'
import type { Conversation } from '@/hooks/useConversations'
import { cn } from '@/lib/utils'

export default function ConversationsPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await fetch('/api/conversations')
      const data = await res.json()
      setConversations(data.conversations || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const newChat = () => router.push('/chat')

  const deleteConv = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this conversation?')) return
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    setConversations(p => p.filter(c => c._id !== id))
    toast.success('Conversation deleted')
  }

  const pinConv = async (id: string, pinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation()
    await fetch(`/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    })
    setConversations(p => p.map(c => c._id === id ? { ...c, pinned } : c))
  }

  const pinned = conversations.filter(c => c.pinned)
  const recent = conversations.filter(c => !c.pinned)

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-24 md:pb-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600/20 to-blue-600/10 border border-violet-200/50 dark:border-violet-800/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">Ava Chats</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Your conversation history</p>
            </div>
          </div>
          <Button onClick={newChat} size="sm" className="gap-1.5 rounded-xl h-9">
            <Plus className="w-4 h-4" /> New chat
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-[68px] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && conversations.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/15 to-blue-600/10 border border-violet-200/40 dark:border-violet-800/30 flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-violet-500 opacity-60" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-sm">No conversations yet</p>
              <p className="text-xs text-muted-foreground">Start a chat with Ava to get going</p>
            </div>
            <Button onClick={newChat} size="sm" variant="outline" className="gap-2 rounded-xl mt-2">
              <Sparkles className="w-3.5 h-3.5" /> Chat with Ava
            </Button>
          </div>
        )}

        {/* Pinned section */}
        {!loading && pinned.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <Pin className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pinned</span>
            </div>
            <div className="space-y-1.5">
              {pinned.map(c => <ConvCard key={c._id} conv={c} onDelete={deleteConv} onPin={pinConv} />)}
            </div>
          </div>
        )}

        {/* Recent */}
        {!loading && recent.length > 0 && (
          <div>
            {pinned.length > 0 && (
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent</span>
              </div>
            )}
            <div className="space-y-1.5">
              {recent.map(c => <ConvCard key={c._id} conv={c} onDelete={deleteConv} onPin={pinConv} />)}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

function ConvCard({
  conv, onDelete, onPin,
}: {
  conv: Conversation
  onDelete: (id: string, e: React.MouseEvent) => void
  onPin: (id: string, pinned: boolean, e: React.MouseEvent) => void
}) {
  const router = useRouter()
  const lastMsg = conv.messages[conv.messages.length - 1]
  const preview = lastMsg?.content?.slice(0, 80) || 'No messages yet'

  return (
    <button
      onClick={() => router.push(`/chat?conv=${conv._id}`)}
      className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-border/60 bg-card hover:bg-accent hover:border-primary/20 active:scale-[0.99] transition-all duration-150 text-left touch-manipulation group"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/15 to-blue-600/10 flex items-center justify-center shrink-0">
        <MessageSquare className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-medium text-sm truncate">{conv.title}</p>
          {conv.pinned && <Pin className="w-3 h-3 text-muted-foreground shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{preview}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => onPin(conv._id, !conv.pinned, e)}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-background text-muted-foreground transition-colors"
          title={conv.pinned ? 'Unpin' : 'Pin'}
        >
          {conv.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={e => onDelete(conv._id, e)}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-background text-destructive transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0 ml-1">
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {timeAgo(new Date(conv.updatedAt).getTime())}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {conv.messages.length} msg{conv.messages.length !== 1 ? 's' : ''}
        </span>
      </div>
    </button>
  )
}
