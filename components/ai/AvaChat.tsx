'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Sparkles, Send, X, Copy, Check, Trash2,
  ChevronDown, FileText, Square, RefreshCw, User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  timestamp: number
}

interface Props {
  onClose?: () => void
  noteContext?: string
  noteTitle?: string
  fullPage?: boolean   // when used as a standalone /chat page
}

const SUGGESTIONS = [
  'Help me brainstorm ideas for my next project',
  'Write a professional email declining a meeting',
  'Summarize the key points from my notes',
  'Create a weekly plan template',
  'Explain machine learning in simple terms',
]

let _c = 0
const gid = () => `m${++_c}`

export function AvaChat({ onClose, noteContext, noteTitle, fullPage }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [copiedId, setCopied] = useState<string | null>(null)
  const [atBottom, setAtBottom] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // scroll to bottom when messages update
  useEffect(() => {
    if (atBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, atBottom])

  useEffect(() => { textareaRef.current?.focus() }, [])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60)
  }

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const userMsg: Message = { id: gid(), role: 'user', content: text.trim(), timestamp: Date.now() }
    const asstId = gid()
    const asstMsg: Message = { id: asstId, role: 'assistant', content: '', streaming: true, timestamp: Date.now() }

    setMessages(p => [...p, userMsg, asstMsg])
    setStreaming(true)
    setAtBottom(true)
    abortRef.current = new AbortController()

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, noteContext }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed') }

      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let acc = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of dec.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d === '[DONE]') break
          try {
            const p = JSON.parse(d)
            if (p.error) throw new Error(p.error)
            if (p.text) { acc += p.text; setMessages(prev => prev.map(m => m.id === asstId ? { ...m, content: acc } : m)) }
          } catch { /* skip */ }
        }
      }
      setMessages(p => p.map(m => m.id === asstId ? { ...m, streaming: false } : m))
    } catch (err: unknown) {
      const aborted = (err as Error).name === 'AbortError'
      setMessages(p => p.map(m => m.id === asstId
        ? { ...m, content: m.content || (aborted ? '_Stopped._' : `Error: ${(err as Error).message}`), streaming: false }
        : m))
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [messages, streaming, noteContext])

  const stop = () => abortRef.current?.abort()

  const copy = (id: string, txt: string) => {
    navigator.clipboard.writeText(txt)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const regenerate = () => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUser) return
    setMessages(p => p.slice(0, -1))
    send(lastUser.content)
  }

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  return (
    <div className={cn('flex flex-col bg-background', fullPage ? 'h-screen' : 'h-full')}>

      {/* ── Top bar (only in panel mode) ── */}
      {!fullPage && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Ava</p>
            <p className="text-[11px] text-muted-foreground">AI Assistant</p>
          </div>
          <div className="flex gap-1">
            {messages.length > 0 && (
              <button onClick={() => { if (streaming) stop(); setMessages([]) }}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground transition-colors" title="Clear">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onClose && (
              <button onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Note context */}
      {noteContext && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200/50 dark:border-amber-800/30 shrink-0">
          <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300 truncate">
            Using note as context: <strong>{noteTitle || 'Untitled'}</strong>
          </p>
        </div>
      )}

      {/* ── Messages area ── */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">

        {/* Empty / welcome state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-full px-4 py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center mx-auto mb-5 shadow-lg">
              <Sparkles className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-1">Hi, I'm Ava</h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-sm">
              Your AI assistant. Ask me anything — I can write, plan, explain, and more.
            </p>

            <div className="w-full max-w-lg space-y-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="w-full text-left px-4 py-3 rounded-2xl border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all text-sm active:scale-[0.98]">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages — ChatGPT style: full-width, no bubbles */}
        {messages.length > 0 && (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user'
              const isLast = idx === messages.length - 1
              return (
                <div key={msg.id} className={cn('flex gap-4', isUser && 'flex-row-reverse gap-3')}>

                  {/* Avatar */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm',
                    isUser
                      ? 'bg-muted border border-border'
                      : 'bg-gradient-to-br from-violet-500 to-blue-500'
                  )}>
                    {isUser
                      ? <User className="w-4 h-4 text-muted-foreground" />
                      : <Sparkles className="w-4 h-4 text-white" />
                    }
                  </div>

                  {/* Content */}
                  <div className={cn('flex-1 min-w-0 space-y-2', isUser && 'flex flex-col items-end')}>
                    {/* Name */}
                    <p className="text-xs font-semibold text-muted-foreground px-1">
                      {isUser ? 'You' : 'Ava'}
                    </p>

                    {/* Message body */}
                    <div className={cn(
                      'text-sm leading-7',
                      isUser
                        ? 'bg-muted rounded-2xl rounded-tr-sm px-4 py-3 inline-block max-w-[85%] whitespace-pre-wrap text-left'
                        : 'w-full'
                    )}>
                      {isUser ? (
                        <span>{msg.content}</span>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none
                          prose-p:leading-7 prose-p:my-2
                          prose-li:my-0.5 prose-li:leading-6
                          prose-headings:font-semibold prose-headings:my-3
                          prose-pre:bg-zinc-900 prose-pre:rounded-xl prose-pre:text-xs
                          prose-code:bg-muted prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.8em]
                          prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground
                          prose-strong:font-semibold prose-strong:text-foreground">
                          <ReactMarkdown>{msg.content || (msg.streaming ? '\u200b' : '')}</ReactMarkdown>
                          {msg.streaming && (
                            <span className="inline-flex gap-1 items-end ml-1 mb-1">
                              {[0, 150, 300].map(d => (
                                <span key={d} className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
                                  style={{ animationDelay: `${d}ms` }} />
                              ))}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action row for assistant */}
                    {!isUser && !msg.streaming && msg.content && (
                      <div className="flex items-center gap-1 px-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                        <button onClick={() => copy(msg.id, msg.content)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-accent transition-colors">
                          {copiedId === msg.id
                            ? <><Check className="w-3.5 h-3.5 text-green-500" />Copied</>
                            : <><Copy className="w-3.5 h-3.5" />Copy</>
                          }
                        </button>
                        {isLast && !streaming && (
                          <button onClick={regenerate}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-accent transition-colors">
                            <RefreshCw className="w-3.5 h-3.5" />Regenerate
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Scroll to bottom */}
      {!atBottom && (
        <button
          onClick={() => { setAtBottom(true); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
          className="absolute right-6 bottom-28 w-9 h-9 rounded-full bg-background border border-border shadow-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-all z-10">
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* ── Input bar — ChatGPT style ── */}
      <div className="shrink-0 px-4 pb-4 pt-3 border-t border-border bg-background">
        <div className="max-w-3xl mx-auto">
          <div className={cn(
            'relative flex items-end gap-3 rounded-2xl border bg-background transition-all shadow-sm',
            'border-border focus-within:border-primary focus-within:shadow-md',
            'px-4 py-3'
          )}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={onInput}
              onKeyDown={onKey}
              placeholder="Message Ava…"
              rows={1}
              disabled={streaming}
              className="flex-1 bg-transparent text-sm outline-none resize-none leading-relaxed max-h-48 disabled:opacity-40 placeholder:text-muted-foreground"
            />

            {streaming ? (
              <button onClick={stop} title="Stop generating"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium hover:bg-foreground/80 active:scale-95 transition-all shrink-0">
                <Square className="w-3 h-3 fill-background" />
                Stop
              </button>
            ) : (
              <button onClick={() => send(input)} disabled={!input.trim()}
                className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-20 hover:bg-primary/90 active:scale-95 transition-all shadow-sm">
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-center text-[11px] text-muted-foreground/60 mt-2">
            Ava can make mistakes. Powered by Gemini 2.5 Flash · Free
          </p>
        </div>
      </div>
    </div>
  )
}
