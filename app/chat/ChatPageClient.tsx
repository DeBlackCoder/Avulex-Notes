'use client'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'

const AvaChat = dynamic(() => import('@/components/ai/AvaChat').then(m => m.AvaChat), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-blue-600 flex items-center justify-center shadow-xl shadow-violet-500/30 animate-pulse" />
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    </div>
  ),
})

export function ChatPageClient() {
  const router = useRouter()
  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <AvaChat fullPage onClose={() => router.back()} />
      </div>
    </div>
  )
}
