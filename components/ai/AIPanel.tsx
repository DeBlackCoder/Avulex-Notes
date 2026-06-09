'use client'
import { useState } from 'react'
import {
  Sparkles, X, Loader2, Copy, Check, Wand2,
  ListChecks, FileText, Languages, Briefcase,
  Scissors, Zap, Tag, MessageSquare, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface AIPanelProps {
  content: string
  selection?: string
  noteTitle?: string
  onApply: (text: string, mode?: 'replace' | 'insert' | 'title') => void
  onClose: () => void
}

const ACTIONS = [
  {
    id: 'improve',           label: 'Improve Writing',    icon: Wand2,          color: 'text-violet-500',   bg: 'bg-violet-500/10',
    desc: 'Clearer, more engaging',
  },
  {
    id: 'fix-grammar',       label: 'Fix Grammar',        icon: Check,          color: 'text-green-500',    bg: 'bg-green-500/10',
    desc: 'Spelling & punctuation',
  },
  {
    id: 'make-professional', label: 'Professionalize',    icon: Briefcase,      color: 'text-blue-500',     bg: 'bg-blue-500/10',
    desc: 'Business tone',
  },
  {
    id: 'simplify',          label: 'Simplify',           icon: Scissors,       color: 'text-orange-500',   bg: 'bg-orange-500/10',
    desc: 'Plain language',
  },
  {
    id: 'summarize',         label: 'Summarize',          icon: FileText,       color: 'text-sky-500',      bg: 'bg-sky-500/10',
    desc: 'Key points & actions',
  },
  {
    id: 'extract-actions',   label: 'Extract Tasks',      icon: ListChecks,     color: 'text-emerald-500',  bg: 'bg-emerald-500/10',
    desc: 'Action item checklist',
  },
  {
    id: 'generate-tags',     label: 'Auto-Tag',           icon: Tag,            color: 'text-pink-500',     bg: 'bg-pink-500/10',
    desc: 'Smart topic tags',
  },
  {
    id: 'meeting-assistant', label: 'Meeting Notes',      icon: MessageSquare,  color: 'text-amber-500',    bg: 'bg-amber-500/10',
    desc: 'Summary & decisions',
  },
  {
    id: 'generate-title',    label: 'Generate Title',     icon: Zap,            color: 'text-yellow-500',   bg: 'bg-yellow-500/10',
    desc: 'Auto-create title',
  },
  {
    id: 'translate',         label: 'Translate',          icon: Languages,      color: 'text-cyan-500',     bg: 'bg-cyan-500/10',
    desc: 'Any language',
  },
] as const

type ActionId = typeof ACTIONS[number]['id']

const LANGS = ['French', 'Spanish', 'Arabic', 'German', 'Chinese', 'Japanese', 'Hindi', 'Portuguese']

export function AIPanel({ content, selection, noteTitle, onApply, onClose }: AIPanelProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [tags, setTags] = useState<string[] | null>(null)
  const [resultAction, setResultAction] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [lang, setLang] = useState('French')
  const [prompt, setPrompt] = useState('')
  const [showPromptInput, setShowPromptInput] = useState(false)

  const run = async (id: ActionId | 'generate-content') => {
    const text = selection || content
    if (!text.trim() && id !== 'generate-content') { toast.error('Note is empty'); return }
    setLoading(id); setResult(null); setTags(null); setResultAction(id)

    try {
      const body: Record<string, unknown> = {
        content: id === 'generate-content' ? (prompt || 'Write a helpful note') : text,
        selection: selection || undefined,
        targetLanguage: id === 'translate' ? lang : undefined,
      }
      const res = await fetch(`/api/ai/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI request failed')

      if (id === 'generate-tags') setTags(Array.isArray(data.result) ? data.result : [])
      else setResult(data.result)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'AI failed. Try again.')
    } finally {
      setLoading(null)
    }
  }

  const copy = () => {
    if (!result) return
    navigator.clipboard.writeText(result)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const apply = () => {
    if (!result) return
    if (resultAction === 'generate-title') {
      onApply(result, 'title'); onClose(); toast.success('Title updated')
    } else if (
      resultAction === 'improve' || resultAction === 'fix-grammar' ||
      resultAction === 'make-professional' || resultAction === 'simplify' ||
      resultAction === 'translate'
    ) {
      // Writing rewrites — replace whole content
      onApply(result, 'replace'); onClose(); toast.success('Note rewritten')
    } else {
      // Summaries, tasks, generated content — insert/append
      onApply(result, 'insert'); onClose(); toast.success('Inserted into note')
    }
  }

  const canApply = !!result && resultAction !== 'generate-tags'

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="font-semibold text-sm flex-1">AI Actions</span>
        {selection && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            Selection
          </span>
        )}
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Actions grid — 2 col on mobile for touch friendliness */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map(({ id, label, icon: Icon, color, bg, desc }) => {
            const isLoading = loading === id
            return (
              <button
                key={id}
                onClick={() => {
                  if (id === 'translate') {
                    // Show lang picker inline
                  }
                  run(id)
                }}
                disabled={!!loading}
                className={cn(
                  'flex flex-col items-start gap-2 p-3 rounded-2xl border border-border/50',
                  'hover:border-primary/30 hover:bg-accent/50 active:scale-[0.97]',
                  'transition-all text-left disabled:opacity-50',
                  isLoading && 'border-primary/40 bg-primary/5'
                )}
              >
                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', bg)}>
                  {isLoading
                    ? <Loader2 className={cn('w-4 h-4 animate-spin', color)} />
                    : <Icon className={cn('w-4 h-4', color)} />
                  }
                </div>
                <div>
                  <p className="text-xs font-semibold leading-tight">{label}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{desc}</p>
                </div>
              </button>
            )
          })}

          {/* Generate content — full width */}
          <button
            onClick={() => setShowPromptInput(v => !v)}
            className="col-span-2 flex items-center gap-3 p-3 rounded-2xl border border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 active:scale-[0.98] transition-all text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold">Generate Content</p>
              <p className="text-[11px] text-muted-foreground">Write anything from a prompt</p>
            </div>
            <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', showPromptInput && 'rotate-90')} />
          </button>
        </div>

        {/* Translate lang picker */}
        <div className="mt-3">
          <p className="text-[11px] text-muted-foreground font-medium mb-2 px-1">Translate to:</p>
          <div className="flex gap-1.5 flex-wrap">
            {LANGS.map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={cn(
                  'text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                  lang === l ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent text-muted-foreground'
                )}
              >{l}</button>
            ))}
          </div>
        </div>

        {/* Generate content prompt */}
        {showPromptInput && (
          <div className="mt-3 flex gap-2">
            <input
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Write a business proposal…"
              className="flex-1 text-sm bg-muted rounded-xl px-3 py-2.5 outline-none border border-border focus:border-primary transition-colors"
              onKeyDown={e => e.key === 'Enter' && run('generate-content')}
            />
            <button
              onClick={() => run('generate-content')}
              disabled={!!loading}
              className="px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              {loading === 'generate-content' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Go'}
            </button>
          </div>
        )}
      </div>

      {/* Result panel */}
      {(result || tags) && (
        <div className="border-t border-border shrink-0">
          {/* Result header */}
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
            <p className="text-xs font-semibold text-muted-foreground">Result</p>
            <div className="flex items-center gap-1">
              {result && (
                <button onClick={copy} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
                  {copied ? <><Check className="w-3.5 h-3.5 text-green-500" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              )}
              {canApply && (
                <button onClick={apply} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">
                  <Sparkles className="w-3.5 h-3.5" /> Apply
                </button>
              )}
              <button onClick={() => { setResult(null); setTags(null) }} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-accent text-muted-foreground transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tags */}
          {tags && (
            <div className="flex flex-wrap gap-1.5 px-3 pb-3">
              {tags.map(tag => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">#{tag}</span>
              ))}
            </div>
          )}

          {/* Text result */}
          {result && (
            <div className="max-h-52 overflow-y-auto px-3 pb-3">
              <pre className="text-xs whitespace-pre-wrap font-sans text-foreground bg-muted/50 rounded-xl p-3 leading-relaxed">{result}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
