'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AvaChat } from '@/components/ai/AvaChat'

interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface LoadedConv {
  id: string
  messages: StoredMessage[]
  noteContext?: string | null
}

export function ChatPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const convId = searchParams.get('conv')

  const [conv, setConv] = useState<LoadedConv | null>(null)
  const [loading, setLoading] = useState(!!convId)

  useEffect(() => {
    if (!convId) { setLoading(false); return }

    fetch(`/api/conversations/${convId}`)
      .then(r => r.json())
      .then(data => {
        if (data.conversation) {
          setConv({
            id: data.conversation._id,
            messages: data.conversation.messages || [],
            noteContext: data.conversation.noteContext || null,
          })
        }
      })
      .catch(() => {/* start fresh on error */})
      .finally(() => setLoading(false))
  }, [convId])

  if (loading) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-blue-600 flex items-center justify-center shadow-xl shadow-violet-500/30 animate-pulse" />
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading conversation…</p>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <AvaChat
        fullPage
        onClose={() => router.back()}
        initialConvId={conv?.id}
        initialMessages={conv?.messages.map((m, i) => ({
          id: `loaded-${i}`,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp).getTime(),
        }))}
      />
    </div>
  )
}
