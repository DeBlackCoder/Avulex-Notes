'use client'
import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Loader2, X, Bot, User } from 'lucide-react'
import { getDB } from '@/lib/db'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

interface Props {
  onClose: () => void
}

const SUGGESTIONS = [
  'What projects did I work on this week?',
  'Summarize all my meeting notes',
  'What are my pending action items?',
  'Show notes related to design',
  'What decisions did I make last month?',
]

export function AskNotesChat({ onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (question: string) => {
    if (!question.trim() || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: question }])
    setLoading(true)

    try {
      // Load all notes from local DB
      const db = getDB()
      const allNotes = await db.notes
        .filter(n => !n.isTrashed && !n.isArchived)
        .toArray()

      const notes = allNotes.map(n => ({
        title: n.title || 'Untitled',
        content: n.content?.slice(0, 1000) || '',
      }))

      const res = await fetch('/api/ai/second-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI failed')

      setMessages(prev => [...prev, { role: 'assistant', text: data.result }])
    } catch (e: unknown) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: e instanceof Error ? `Error: ${e.message}` : 'Something went wrong. Try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Ask Your Notes</p>
          <p className="text-xs text-muted-foreground">Your personal knowledge base</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <p className="font-semibold">Ask anything about your notes</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                I'll search through all your notes and answer based on what you've written.
              </p>
            </div>

            {/* Suggestions */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Try asking:</p>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full text-left text-sm px-3 py-2.5 rounded-xl bg-muted/50 hover:bg-accent border border-border/50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
              msg.role === 'user' ? 'bg-primary' : 'bg-muted'
            )}>
              {msg.role === 'user'
                ? <User className="w-4 h-4 text-primary-foreground" />
                : <Bot className="w-4 h-4 text-muted-foreground" />
              }
            </div>
            <div className={cn(
              'max-w-[80%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-muted text-foreground rounded-tl-sm'
            )}>
              <pre className="whitespace-pre-wrap font-sans">{msg.text}</pre>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex gap-2 items-end">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
            placeholder="Ask about your notes…"
            className="flex-1 bg-muted rounded-2xl px-4 py-3 text-sm outline-none border border-border focus:border-primary transition-colors resize-none"
            disabled={loading}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
