'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Sparkles, Send, X, Copy, Check, Trash2,
  ChevronDown, FileText, Square, RefreshCw, User,
  Lightbulb, PenLine, ClipboardList, BookOpen, Zap, MessageSquare,
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
  fullPage?: boolean
}

const SUGGESTIONS = [
  { icon: Lightbulb,     text: 'Help me brainstorm project ideas' },
  { icon: PenLine,       text: 'Write a professional email draft' },
  { icon: ClipboardList, text: 'Create a weekly plan template' },
  { icon: BookOpen,      text: 'Summarize key points from my notes' },
  { icon: Zap,           text: 'Explain machine learning simply' },
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

  const hasMessages = messages.length > 0

  return (
    <div className={cn(
      'flex flex-col bg-background',
      // dvh accounts for mobile browser chrome (address bar, home indicator)
      fullPage ? 'h-[100dvh]' : 'h-full'
    )}>

      {/* ── Top bar ── */}
      <div className={cn(
        'flex items-center gap-3 px-4 border-b border-border/60 shrink-0 bg-background/95 backdrop-blur-sm',
        fullPage ? 'py-4 safe-area-top' : 'py-3'
      )}>
        {/* Avatar with online dot */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-md shadow-violet-500/25">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm leading-none">Ava</p>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
            AI Assistant · Gemini 2.5 Flash
          </p>
        </div>

        <div className="flex gap-0.5 shrink-0">
          {hasMessages && (
            <button
              onClick={() => { if (streaming) stop(); setMessages([]) }}
              className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center hover:bg-accent active:bg-accent/70 text-muted-foreground transition-all duration-150 active:scale-[0.97] touch-manipulation"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center hover:bg-accent active:bg-accent/70 text-muted-foreground transition-all duration-150 active:scale-[0.97] touch-manipulation"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Note context banner */}
      {noteContext && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-800/30 shrink-0">
          <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300 truncate">
            Context: <span className="font-medium">{noteTitle || 'Untitled'}</span>
          </p>
        </div>
      )}

      {/* ── Messages area ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Empty / welcome state */}
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center min-h-full px-5 py-12 text-center">
            {/* Glowing avatar */}
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-2xl scale-150" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-xl shadow-violet-500/25">
                <Sparkles className="w-9 h-9 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2 tracking-tight">Hi, I&apos;m Ava</h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-xs leading-relaxed">
              Your AI assistant. Ask me anything — I can write, plan, explain, and more.
            </p>

            {/* Suggestion chips — icon + text, vertical on desktop, horizontal scroll on mobile */}
            <div className="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-5 px-5">
              <div className="flex gap-2 pb-1 w-max sm:w-auto sm:flex-col sm:max-w-sm sm:mx-auto">
                {SUGGESTIONS.map(({ icon: Icon, text }) => (
                  <button
                    key={text}
                    onClick={() => send(text)}
                    className={cn(
                      'shrink-0 sm:shrink text-left flex items-center gap-3',
                      'px-4 py-3 rounded-2xl border border-border/70',
                      'bg-background hover:bg-accent active:bg-accent/80',
                      'transition-all duration-150 active:scale-[0.98]',
                      'min-h-[52px] touch-manipulation',
                      'whitespace-nowrap sm:whitespace-normal'
                    )}
                  >
                    <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <span className="text-sm text-foreground leading-snug">{text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {hasMessages && (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user'
              const isLast = idx === messages.length - 1
              return (
                <div key={msg.id} className={cn(
                  'flex gap-3 items-end',
                  isUser ? 'flex-row-reverse' : 'flex-row'
                )}>
                  {/* Avatar */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-0.5',
                    isUser
                      ? 'bg-muted border border-border/60'
                      : 'bg-gradient-to-br from-violet-600 to-blue-600 shadow-sm shadow-violet-500/20'
                  )}>
                    {isUser
                      ? <User className="w-4 h-4 text-muted-foreground" />
                      : <Sparkles className="w-4 h-4 text-white" />
                    }
                  </div>

                  {/* Content */}
                  <div className={cn('flex-1 min-w-0', isUser && 'flex flex-col items-end')}>
                    {isUser ? (
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-3 inline-block max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap text-left shadow-sm">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="w-full">
                        {/* Typing indicator */}
                        {msg.streaming && !msg.content ? (
                          <div className="inline-flex items-center gap-1.5 px-4 py-3.5 rounded-2xl rounded-bl-sm bg-muted/60 border border-border/40">
                            <span className="text-xs text-muted-foreground mr-1">Ava is thinking</span>
                            {[0, 150, 300].map(d => (
                              <span
                                key={d}
                                className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                                style={{ animationDelay: `${d}ms` }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm leading-7">
                            <div className="prose prose-sm dark:prose-invert max-w-none
                              prose-p:leading-7 prose-p:my-2 first:prose-p:mt-0
                              prose-li:my-0.5 prose-li:leading-6
                              prose-headings:font-semibold prose-headings:my-3
                              prose-pre:bg-zinc-950 prose-pre:rounded-xl prose-pre:text-xs prose-pre:border prose-pre:border-border
                              prose-code:bg-muted prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.8em] prose-code:font-mono
                              prose-blockquote:border-l-violet-400 prose-blockquote:text-muted-foreground prose-blockquote:not-italic
                              prose-strong:font-semibold prose-strong:text-foreground
                              prose-a:text-violet-600 dark:prose-a:text-violet-400 prose-a:no-underline hover:prose-a:underline">
                              <ReactMarkdown>{msg.content || (msg.streaming ? '\u200b' : '')}</ReactMarkdown>
                            </div>
                            {msg.streaming && msg.content && (
                              <span className="inline-flex gap-1 items-end mt-1 ml-0.5">
                                {[0, 150, 300].map(d => (
                                  <span
                                    key={d}
                                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                                    style={{ animationDelay: `${d}ms` }}
                                  />
                                ))}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Action row */}
                        {!msg.streaming && msg.content && (
                          <div className="flex items-center gap-0.5 mt-2">
                            <button
                              onClick={() => copy(msg.id, msg.content)}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground active:text-foreground px-3 py-2 rounded-xl hover:bg-accent active:bg-accent/80 transition-all duration-150 active:scale-[0.97] min-h-[40px] touch-manipulation"
                            >
                              {copiedId === msg.id
                                ? <><Check className="w-3.5 h-3.5 text-emerald-500" />Copied</>
                                : <><Copy className="w-3.5 h-3.5" />Copy</>
                              }
                            </button>
                            {isLast && !streaming && (
                              <button
                                onClick={regenerate}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground active:text-foreground px-3 py-2 rounded-xl hover:bg-accent active:bg-accent/80 transition-all duration-150 active:scale-[0.97] min-h-[40px] touch-manipulation"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />Regenerate
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} className="h-1" />
          </div>
        )}
      </div>

      {/* Scroll-to-bottom button */}
      {!atBottom && (
        <div className="absolute right-4 bottom-28 z-10">
          <button
            onClick={() => { setAtBottom(true); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
            className="w-10 h-10 rounded-full bg-background border border-border shadow-lg flex items-center justify-center text-muted-foreground hover:bg-accent active:bg-accent/80 transition-all duration-150 active:scale-[0.97] touch-manipulation"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Input area ── */}
      <div className="shrink-0 border-t border-border/60 bg-background/98 backdrop-blur-md"
        style={{ paddingBottom: 'max(1.25rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}>
        <div className="px-4 pt-3 pb-1 max-w-3xl mx-auto">
          <div className={cn(
            'flex items-end gap-2 rounded-3xl border bg-background transition-all duration-200',
            'border-border/80 focus-within:border-violet-400/70 dark:focus-within:border-violet-500/60',
            'focus-within:ring-2 focus-within:ring-violet-500/10',
            'px-4 py-3 shadow-sm focus-within:shadow-lg'
          )}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={onInput}
              onKeyDown={onKey}
              placeholder="Message Ava…"
              rows={1}
              disabled={streaming}
              className="flex-1 bg-transparent text-sm outline-none resize-none leading-relaxed max-h-36 disabled:opacity-40 placeholder:text-muted-foreground/50 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            />

            {streaming ? (
              <button
                onClick={stop}
                title="Stop generating"
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-foreground text-background text-xs font-medium hover:bg-foreground/80 active:scale-[0.97] transition-all duration-150 shrink-0 min-h-[40px] touch-manipulation"
              >
                <Square className="w-3 h-3 fill-background" />
                Stop
              </button>
            ) : (
              <button
                onClick={() => send(input)}
                disabled={!input.trim()}
                className="w-9 h-9 rounded-2xl bg-violet-600 text-white flex items-center justify-center shrink-0 disabled:opacity-25 hover:bg-violet-700 active:scale-[0.95] transition-all duration-150 shadow-sm touch-manipulation"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-center text-[11px] text-muted-foreground/40 mt-2 pb-1">
            Ava can make mistakes · Free
          </p>
        </div>
      </div>
    </div>
  )
}
