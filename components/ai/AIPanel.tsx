'use client'
import { useState } from 'react'
import {
  Sparkles, X, Loader2, Copy, Check, Wand2,
  ListChecks, FileText, Languages, Briefcase,
  Scissors, Zap, Tag, MessageSquare, ChevronRight,
  CheckCircle2, XCircle, ArrowLeft,
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
  { id: 'improve',           label: 'Improve Writing',  icon: Wand2,         color: 'text-violet-500',  bg: 'bg-violet-500/10',  desc: 'Clearer, more engaging' },
  { id: 'fix-grammar',       label: 'Fix Grammar',      icon: Check,         color: 'text-green-500',   bg: 'bg-green-500/10',   desc: 'Spelling & punctuation' },
  { id: 'make-professional', label: 'Professional',     icon: Briefcase,     color: 'text-blue-500',    bg: 'bg-blue-500/10',    desc: 'Business tone' },
  { id: 'simplify',          label: 'Simplify',         icon: Scissors,      color: 'text-orange-500',  bg: 'bg-orange-500/10',  desc: 'Plain language' },
  { id: 'summarize',         label: 'Summarize',        icon: FileText,      color: 'text-sky-500',     bg: 'bg-sky-500/10',     desc: 'Key points & actions' },
  { id: 'extract-actions',   label: 'Extract Tasks',    icon: ListChecks,    color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: 'Action item checklist' },
  { id: 'generate-tags',     label: 'Auto-Tag',         icon: Tag,           color: 'text-pink-500',    bg: 'bg-pink-500/10',    desc: 'Smart topic tags' },
  { id: 'meeting-assistant', label: 'Meeting Notes',    icon: MessageSquare, color: 'text-amber-500',   bg: 'bg-amber-500/10',   desc: 'Summary & decisions' },
  { id: 'generate-title',    label: 'Generate Title',   icon: Zap,           color: 'text-yellow-500',  bg: 'bg-yellow-500/10',  desc: 'Auto-create title' },
  { id: 'translate',         label: 'Translate',        icon: Languages,     color: 'text-cyan-500',    bg: 'bg-cyan-500/10',    desc: 'Any language' },
] as const

type ActionId = typeof ACTIONS[number]['id']

const LANGS = ['French', 'Spanish', 'Arabic', 'German', 'Chinese', 'Japanese', 'Hindi', 'Portuguese']

// Determine apply mode from action type
function getApplyMode(action: string): 'replace' | 'insert' | 'title' {
  if (action === 'generate-title') return 'title'
  if (['improve', 'fix-grammar', 'make-professional', 'simplify', 'translate'].includes(action)) return 'replace'
  return 'insert'
}

export function AIPanel({ content, selection, noteTitle, onApply, onClose }: AIPanelProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [tags, setTags] = useState<string[] | null>(null)
  const [resultAction, setResultAction] = useState<string | null>(null)
  const [resultLabel, setResultLabel] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [lang, setLang] = useState('French')
  const [prompt, setPrompt] = useState('')
  const [showPromptInput, setShowPromptInput] = useState(false)

  const run = async (id: ActionId | 'generate-content') => {
    const text = selection || content
    if (!text.trim() && id !== 'generate-content') { toast.error('Note is empty'); return }
    setResult(null); setTags(null)
    setLoading(id)
    const label = id === 'generate-content' ? 'Generated Content' : ACTIONS.find(a => a.id === id)?.label ?? id
    setResultLabel(label)
    setResultAction(id)

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
      setResultAction(null)
    } finally {
      setLoading(null)
    }
  }

  const copy = () => {
    if (!result) return
    navigator.clipboard.writeText(result)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const accept = () => {
    if (!result || !resultAction) return
    onApply(result, getApplyMode(resultAction))
    setResult(null); setTags(null); setResultAction(null)
  }

  const dismiss = () => {
    setResult(null); setTags(null); setResultAction(null)
  }

  const canApply = !!result && resultAction !== 'generate-tags'
  const hasResult = !!(result || tags)

  // ── RESULT REVIEW SCREEN ─────────────────────────────────────────────────
  // When AI returns a result, show a dedicated full-height review screen
  // so the user can clearly see the output and has large Accept/Dismiss buttons
  if (hasResult) {
    const mode = resultAction ? getApplyMode(resultAction) : 'insert'
    const modeLabel = mode === 'replace' ? 'Replace note content' : mode === 'title' ? 'Set as title' : 'Add to note'
    const modeColor = mode === 'replace' ? 'bg-orange-500 hover:bg-orange-600' : mode === 'title' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-primary hover:bg-primary/90'

    return (
      <div className="flex flex-col h-full bg-background">
        {/* Review header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
          <button
            onClick={dismiss}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <p className="font-semibold text-sm">{resultLabel}</p>
            <p className="text-[11px] text-muted-foreground">{noteTitle ? `for "${noteTitle}"` : 'Review AI result'}</p>
          </div>
          <button onClick={copy} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl hover:bg-accent border border-border transition-colors text-muted-foreground">
            {copied ? <><Check className="w-3.5 h-3.5 text-green-500" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
          </button>
        </div>

        {/* Result content — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {/* Tags result */}
          {tags && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium">Suggested tags:</p>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span key={tag} className="text-sm px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Text result */}
          {result && (
            <div className="space-y-2">
              {/* Mode indicator */}
              <div className={cn(
                'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full',
                mode === 'replace' ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300' :
                mode === 'title'   ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' :
                                     'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
              )}>
                {mode === 'replace' ? '⚠️ Will replace your note' : mode === 'title' ? '✏️ Will update title' : '➕ Will add to note'}
              </div>

              {/* The AI output */}
              <div className="bg-muted/40 rounded-2xl border border-border p-4">
                <pre className="text-sm whitespace-pre-wrap font-sans text-foreground leading-relaxed">{result}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons — always visible at bottom, large touch targets */}
        <div className="shrink-0 px-4 pb-4 pt-3 border-t border-border bg-background space-y-2"
          style={{ paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.75rem))' }}>

          {canApply && (
            <button
              onClick={accept}
              className={cn(
                'w-full h-14 rounded-2xl text-white font-semibold text-base flex items-center justify-center gap-2.5',
                'transition-all active:scale-[0.98] touch-manipulation shadow-md',
                modeColor
              )}
            >
              <CheckCircle2 className="w-5 h-5" />
              {modeLabel}
            </button>
          )}

          <button
            onClick={dismiss}
            className="w-full h-12 rounded-2xl border border-border bg-muted/50 hover:bg-muted text-foreground font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] touch-manipulation"
          >
            <XCircle className="w-4 h-4 text-muted-foreground" />
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  // ── ACTIONS LIST ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="font-semibold text-sm flex-1">AI Actions</span>
        {selection && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Selection</span>
        )}
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Actions grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map(({ id, label, icon: Icon, color, bg, desc }) => {
            const isLoading = loading === id
            return (
              <button
                key={id}
                onClick={() => run(id)}
                disabled={!!loading}
                className={cn(
                  'flex flex-col items-start gap-2 p-3 rounded-2xl border border-border/50 min-h-[80px]',
                  'hover:border-primary/30 hover:bg-accent/50 active:scale-[0.97] touch-manipulation',
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

          {/* Generate content */}
          <button
            onClick={() => setShowPromptInput(v => !v)}
            className="col-span-2 flex items-center gap-3 p-3 rounded-2xl border border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 active:scale-[0.98] transition-all text-left touch-manipulation"
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

        {/* Translate picker */}
        <div className="mt-3">
          <p className="text-[11px] text-muted-foreground font-medium mb-2 px-1">Translate to:</p>
          <div className="flex gap-1.5 flex-wrap">
            {LANGS.map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={cn(
                  'text-[11px] px-2.5 py-1 rounded-full border transition-colors touch-manipulation',
                  lang === l ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent text-muted-foreground'
                )}
              >{l}</button>
            ))}
          </div>
        </div>

        {/* Generate prompt input */}
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
              className="px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors touch-manipulation"
            >
              {loading === 'generate-content' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Go'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
