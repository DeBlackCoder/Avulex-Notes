'use client'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Loader2 } from 'lucide-react'

const AvaChat = dynamic(() => import('@/components/ai/AvaChat').then(m => m.AvaChat), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  ),
})

export function ChatPageClient() {
  const router = useRouter()
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top nav */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm shrink-0">
        <button onClick={() => router.back()}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="font-semibold text-sm">Ava</p>
          <p className="text-xs text-muted-foreground">AI Assistant</p>
        </div>
      </header>
      <div className="flex-1 overflow-hidden relative">
        <AvaChat fullPage />
      </div>
    </div>
  )
}
