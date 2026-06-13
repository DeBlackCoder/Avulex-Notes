'use client'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'

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
    <div className="h-[100dvh] flex flex-col bg-background">
      {/* Top nav — premium mobile header */}
      <header className="flex items-center gap-3 px-3 py-2.5 border-b border-border/60 bg-background/95 backdrop-blur-sm shrink-0 safe-area-top">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-accent active:bg-accent/80 transition-all duration-150 active:scale-[0.97] touch-manipulation text-muted-foreground shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Ava identity */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-sm shadow-violet-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-none">Ava</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">AI Assistant · Always on</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative">
        <AvaChat fullPage />
      </div>
    </div>
  )
}
