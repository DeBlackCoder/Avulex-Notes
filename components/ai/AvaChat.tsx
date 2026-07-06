'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Sparkles, Send, X, Copy, Check, Trash2, ChevronDown,
  FileText, Square, RefreshCw, User, Lightbulb, PenLine,
  ClipboardList, BookOpen, Zap, FilePen, FilePlus, FileEdit,
  AlignJustify, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  timestamp: number
  noteAction?: 'replace' | 'insert' | 'append'
}

interface Props {
  onClose?: () => void
  noteContext?: string
  noteTitle?: string
  fullPage?: boolean
  onEditNote?: (text: string, mode: 'replace' | 'insert' | 'append') => void
  onRenameNote?: (title: string) => void
}

const SUGGESTIONS = [
  { icon: Lightbulb,     text: 'Help me brainstorm project ideas' },
  { icon: PenLine,       text: 'Write a professional email draft' },
  { icon: ClipboardList, text: 'Create a weekly plan template' },
  { icon: BookOpen,      text: 'Summarize key points from my notes' },
  { icon: Zap,           text: 'Explain machine learning simply' },
]

function detectNoteEditMode(text: string): 'replace' | 'insert' | 'append' | null {
  const t = text.toLowerCase().trim()
  if (/^(replace|rewrite|overwrite|reword|improve)\b/.test(t)) return 'replace'
  if (/^(insert|add|write|put)\b.*(note|content|here)/.test(t)) return 'insert'
  if (/^(append|continue|add at the end|add more|expand)\b/.test(t)) return 'append'
  return null
}

let _c = 0
const gid = () => `m${++_c}`

export function AvaChat({ onClose, noteContext, noteTitle, fullPage, onEditNote, onRenameNote }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [copiedId, setCopied] = useState<string | null>(null)
  const [atBottom, setAtBottom] = useState(true)
  const [summarizing, setSummarizing] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
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
    setSummary(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // Detect if user wants to edit the note
    const noteMode = noteContext ? detectNoteEditMode(text) : null

    const userMsg: Message = {
      id: gid(), role: 'user', content: text.trim(), timestamp: Date.now(),
      ...(noteMode ? { noteAction: noteMode } : {}),
    }
    const asstId = gid()
    const asstMsg: Message = { id: asstId, role: 'assistant', content: '', streaming: true, timestamp: Date.now() }

    setMessages(p => [...p, userMsg, asstMsg])
    setStreaming(true)
    setAtBottom(true)
    abortRef.current = new AbortController()

    // Build system with note-edit instruction if applicable
    const systemExtra = noteMode
      ? `\n\nThe user wants you to ${noteMode === 'replace' ? 'rewrite the entire note' : noteMode === 'append' ? 'write content to append at the end' : 'write content to insert into the note'}. Return ONLY the content to be applied — no meta commentary.`
      : ''

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, noteContext, systemExtra }),
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

      setMessages(p => p.map(m => m.id === asstId
        ? { ...m, streaming: false, ...(noteMode ? { noteAction: noteMode } : {}) }
        : m
      ))

      // Auto-apply if note edit intent detected
      if (noteMode && onEditNote && acc.trim()) {
        onEditNote(acc.trim(), noteMode)
      }
    } catch (err: unknown) {
      const aborted = (err as Error).name === 'AbortError'
      setMessages(p => p.map(m => m.id === asstId
        ? { ...m, content: m.content || (aborted ? '_Stopped._' : `Error: ${(err as Error).message}`), streaming: false }
        : m))
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [messages, streaming, noteContext, onEditNote])

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

  const applyToNote = (content: string, mode: 'replace' | 'insert' | 'append') => {
    if (onEditNote) { onEditNote(content, mode) }
  }

  /** Summarize the entire conversation */
  const summarizeChat = async () => {
    if (messages.length < 2 || summarizing) return
    setSummarizing(true)
    try {
      const transcript = messages
        .map(m => `${m.role === 'user' ? 'User' : 'Ava'}: ${m.content}`)
        .join('\n\n')
      const res = await fetch('/api/ai/second-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Summarize this conversation in bullet points: key topics discussed, decisions made, and any action items.',
          notes: [{ title: 'Chat transcript', content: transcript }],
        }),
      })
      const data = await res.json()
      setSummary(data.result || 'Could not generate summary.')
    } catch {
      setSummary('Failed to summarize. Try again.')
    } finally {
      setSummarizing(false)
    }
  }

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  const onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  const hasMessages = messages.length > 0
  const hasNoteEdit = !!onEditNote && !!noteContext

  return (
    <div className={cn('flex flex-col bg-background', fullPage ? 'h-[100dvh]' : 'h-full')}>

      {/* Header */}
      <div className={cn('flex items-center gap-3 px-4 border-b border-border/60 shrink-0 bg-background/95 backdrop-blur-sm', fullPage ? 'py-4' : 'py-3')}>
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-md shadow-violet-500/25">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm leading-none">Ava</p>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Online
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">AI Assistant · Gemini 2.5 Flash</p>
        </div>
        <div className="flex gap-0.5 shrink-0">
          {hasMessages && (
            <button onClick={summarizeChat} disabled={summarizing}
              className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center hover:bg-accent text-muted-foreground transition-all touch-manipulation"
              title="Summarize this conversation">
              {summarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlignJustify className="w-4 h-4" />}
            </button>
          )}
          {hasMessages && (
            <button onClick={() => { if (streaming) stop(); setMessages([]); setSummary(null) }}
              className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center hover:bg-accent text-muted-foreground transition-all touch-manipulation" title="Clear chat">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center hover:bg-accent text-muted-foreground transition-all touch-manipulation">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Note context banner */}
      {noteContext && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-800/30 shrink-0">
          <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300 truncate flex-1">
            Editing: <span className="font-medium">{noteTitle || 'Untitled'}</span>
          </p>
          {hasNoteEdit && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium shrink-0">AI can edit</span>
          )}
        </div>
      )}

      {/* Summary banner */}
      {summary && (
        <div className="mx-4 mt-3 p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200/60 dark:border-violet-800/30 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
              <AlignJustify className="w-3.5 h-3.5" /> Chat Summary
            </p>
            <button onClick={() => setSummary(null)} className="text-violet-400 hover:text-violet-600 transition-colors"><X className="w-3.5 h-3.5" /></button>
          </div>
          <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed whitespace-pre-wrap">{summary}</p>
        </div>
      )}

      {/* Note edit quick actions */}
      {hasNoteEdit && hasMessages && !streaming && (
        <div className="flex gap-2 px-4 py-2 border-b border-border/40 bg-muted/30 overflow-x-auto [scrollbar-width:none] shrink-0">
          <p className="text-[11px] text-muted-foreground self-center shrink-0 mr-1">Edit note:</p>
          {[
            { icon: FileEdit,  label: 'Replace',  mode: 'replace' as const,  cmd: 'Rewrite the note with improvements' },
            { icon: FilePlus,  label: 'Append',   mode: 'append'  as const,  cmd: 'Append a continuation to the note' },
            { icon: FilePen,   label: 'Insert',   mode: 'insert'  as const,  cmd: 'Insert key points into the note' },
          ].map(({ icon: Icon, label, cmd }) => (
            <button key={label} onClick={() => send(cmd)}
              className="flex items-center gap-1.5 shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-xl bg-background border border-border hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-all touch-manipulation">
              <Icon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />{label}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center min-h-full px-5 py-12 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-2xl scale-150" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-xl shadow-violet-500/25">
                <Sparkles className="w-9 h-9 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Hi, I&apos;m Ava</h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-xs leading-relaxed">
              {noteContext ? `I can chat and directly edit "${noteTitle || 'your note'}" — just ask.` : 'Your AI assistant. Ask me anything.'}
            </p>
            <div className="w-full overflow-x-auto [scrollbar-width:none] -mx-5 px-5">
              <div className="flex gap-2 pb-1 w-max sm:w-auto sm:flex-col sm:max-w-sm sm:mx-auto">
                {(noteContext ? [
                  { icon: FileEdit,  text: 'Improve my note writing' },
                  { icon: FilePlus,  text: 'Expand on my note ideas' },
                  { icon: AlignJustify, text: 'Summarize my note' },
                  ...SUGGESTIONS.slice(0, 2),
                ] : SUGGESTIONS).map(({ icon: Icon, text }) => (
                  <button key={text} onClick={() => send(text)}
                    className="shrink-0 sm:shrink text-left flex items-center gap-3 px-4 py-3 rounded-2xl border border-border/70 bg-background hover:bg-accent active:scale-[0.98] transition-all min-h-[52px] touch-manipulation whitespace-nowrap sm:whitespace-normal">
                    <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <span className="text-sm">{text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {hasMessages && (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user'
              const isLast = idx === messages.length - 1
              return (
                <div key={msg.id} className={cn('flex gap-3 items-end', isUser ? 'flex-row-reverse' : 'flex-row')}>
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-0.5',
                    isUser ? 'bg-muted border border-border/60' : 'bg-gradient-to-br from-violet-600 to-blue-600 shadow-sm shadow-violet-500/20')}>
                    {isUser ? <User className="w-4 h-4 text-muted-foreground" /> : <Sparkles className="w-4 h-4 text-white" />}
                  </div>
                  <div className={cn('flex-1 min-w-0', isUser && 'flex flex-col items-end')}>
                    {isUser ? (
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-3 inline-block max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap text-left shadow-sm">
                        {msg.noteAction && (
                          <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full mr-2 mb-1',
                            msg.noteAction === 'replace' ? 'bg-orange-400/20 text-orange-200' :
                            msg.noteAction === 'append'  ? 'bg-blue-400/20 text-blue-200' :
                                                           'bg-green-400/20 text-green-200')}>
                            <FilePen className="w-2.5 h-2.5" />
                            {msg.noteAction === 'replace' ? 'Replace' : msg.noteAction === 'append' ? 'Append' : 'Insert'}
                          </span>
                        )}
                        {msg.content}
                      </div>
                    ) : (
                      <div className="w-full">
                        {msg.streaming && !msg.content ? (
                          <div className="inline-flex items-center gap-1.5 px-4 py-3.5 rounded-2xl rounded-bl-sm bg-muted/60 border border-border/40">
                            <span className="text-xs text-muted-foreground mr-1">Ava is thinking</span>
                            {[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                          </div>
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-7
                            prose-p:leading-7 prose-p:my-2 prose-li:my-0.5 prose-headings:font-semibold prose-headings:my-3
                            prose-pre:bg-zinc-950 prose-pre:rounded-xl prose-pre:text-xs prose-pre:border prose-pre:border-border
                            prose-code:bg-muted prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.8em] prose-code:font-mono
                            prose-blockquote:border-l-violet-400 prose-blockquote:text-muted-foreground prose-blockquote:not-italic
                            prose-a:text-violet-600 dark:prose-a:text-violet-400 prose-a:no-underline hover:prose-a:underline">
                            <ReactMarkdown>{msg.content || (msg.streaming ? '\u200b' : '')}</ReactMarkdown>
                            {msg.streaming && msg.content && (
                              <span className="inline-flex gap-1 items-end mt-1 ml-0.5">
                                {[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                              </span>
                            )}
                          </div>
                        )}
                        {!msg.streaming && msg.content && (
                          <div className="flex flex-wrap items-center gap-1 mt-2">
                            <button onClick={() => copy(msg.id, msg.content)}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl hover:bg-accent transition-all min-h-[40px] touch-manipulation">
                              {copiedId === msg.id ? <><Check className="w-3.5 h-3.5 text-emerald-500" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
                            </button>
                            {isLast && !streaming && (
                              <button onClick={regenerate}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl hover:bg-accent transition-all min-h-[40px] touch-manipulation">
                                <RefreshCw className="w-3.5 h-3.5" />Retry
                              </button>
                            )}
                            {hasNoteEdit && !msg.noteAction && (
                              <>
                                <button onClick={() => applyToNote(msg.content, 'replace')}
                                  className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 px-3 py-2 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all min-h-[40px] touch-manipulation border border-violet-200/50 dark:border-violet-800/40">
                                  <FileEdit className="w-3.5 h-3.5" />Replace note
                                </button>
                                <button onClick={() => applyToNote(msg.content, 'append')}
                                  className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 px-3 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all min-h-[40px] touch-manipulation border border-blue-200/50 dark:border-blue-800/40">
                                  <FilePlus className="w-3.5 h-3.5" />Append
                                </button>
                              </>
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

      {!atBottom && (
        <div className="absolute right-4 bottom-28 z-10">
          <button onClick={() => { setAtBottom(true); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
            className="w-10 h-10 rounded-full bg-background border border-border shadow-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-all touch-manipulation">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-border/60 bg-background/98 backdrop-blur-md"
        style={{ paddingBottom: 'max(1.25rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}>
        <div className="px-4 pt-3 pb-1 max-w-3xl mx-auto">
          <div className={cn('flex items-end gap-2 rounded-3xl border bg-background transition-all',
            'border-border/80 focus-within:border-violet-400/70 dark:focus-within:border-violet-500/60',
            'focus-within:ring-2 focus-within:ring-violet-500/10 px-4 py-3 shadow-sm focus-within:shadow-lg')}>
            <textarea ref={textareaRef} value={input} onChange={onInputChange} onKeyDown={onKey}
              placeholder={noteContext ? 'Ask Ava to write, rewrite, or improve your note…' : 'Message Ava…'}
              rows={1} disabled={streaming}
              className="flex-1 bg-transparent text-sm outline-none resize-none leading-relaxed max-h-36 disabled:opacity-40 placeholder:text-muted-foreground/50 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" />
            {streaming ? (
              <button onClick={stop}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-foreground text-background text-xs font-medium hover:bg-foreground/80 active:scale-[0.97] transition-all shrink-0 min-h-[40px] touch-manipulation">
                <Square className="w-3 h-3 fill-background" />Stop
              </button>
            ) : (
              <button onClick={() => send(input)} disabled={!input.trim()}
                className="w-9 h-9 rounded-2xl bg-violet-600 text-white flex items-center justify-center shrink-0 disabled:opacity-25 hover:bg-violet-700 active:scale-[0.95] transition-all shadow-sm touch-manipulation">
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-center text-[11px] text-muted-foreground/40 mt-2 pb-1">
            {hasNoteEdit ? 'Ava can read and edit your note · Free' : 'Ava can make mistakes · Free'}
          </p>
        </div>
      </div>
    </div>
  )
}
