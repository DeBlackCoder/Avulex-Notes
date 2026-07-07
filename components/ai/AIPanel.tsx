'use client'
import { useState, useRef } from 'react'
import {
  Sparkles, X, Loader2, Copy, Check, Wand2, ListChecks,
  FileText, Languages, Briefcase, Scissors, Zap, Tag,
  MessageSquare, ChevronRight, ArrowLeft, CheckCheck, Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface AIPanelProps {
  content: string
  selection?: string
  noteTitle?: string
  onApply: (text: string, mode?: 'replace' | 'insert' | 'title') => void
  onClose: () => void
  onResultChange?: (hasResult: boolean) => void
}

const ACTIONS = [
  { id: 'improve',           label: 'Improve Writing',  icon: Wand2,         color: 'text-violet-500',  bg: 'bg-violet-500/10',  border: 'border-violet-200/50 dark:border-violet-800/30',  desc: 'Clearer, more engaging' },
  { id: 'fix-grammar',       label: 'Fix Grammar',      icon: Check,         color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-200/50 dark:border-emerald-800/30', desc: 'Fix all grammar errors' },
  { id: 'make-professional', label: 'Professionalize',  icon: Briefcase,     color: 'text-blue-500',    bg: 'bg-blue-500/10',    border: 'border-blue-200/50 dark:border-blue-800/30',    desc: 'Formal business tone' },
  { id: 'simplify',          label: 'Simplify',         icon: Scissors,      color: 'text-orange-500',  bg: 'bg-orange-500/10',  border: 'border-orange-200/50 dark:border-orange-800/30',  desc: 'Plain, easy language' },
  { id: 'summarize',         label: 'Summarize',        icon: FileText,      color: 'text-sky-500',     bg: 'bg-sky-500/10',     border: 'border-sky-200/50 dark:border-sky-800/30',      desc: 'Key points & actions' },
  { id: 'extract-actions',   label: 'Extract Tasks',    icon: ListChecks,    color: 'text-teal-500',    bg: 'bg-teal-500/10',    border: 'border-teal-200/50 dark:border-teal-800/30',    desc: 'Pull out action items' },
  { id: 'generate-tags',     label: 'Auto-Tag',         icon: Tag,           color: 'text-pink-500',    bg: 'bg-pink-500/10',    border: 'border-pink-200/50 dark:border-pink-800/30',    desc: 'Smart topic tags' },
  { id: 'meeting-assistant', label: 'Meeting Notes',    icon: MessageSquare, color: 'text-amber-500',   bg: 'bg-amber-500/10',   border: 'border-amber-200/50 dark:border-amber-800/30',   desc: 'Summary & decisions' },
  { id: 'generate-title',    label: 'Generate Title',   icon: Zap,           color: 'text-yellow-500',  bg: 'bg-yellow-500/10',  border: 'border-yellow-200/50 dark:border-yellow-800/30',  desc: 'Smart note title' },
  { id: 'translate',         label: 'Translate',        icon: Languages,     color: 'text-cyan-500',    bg: 'bg-cyan-500/10',    border: 'border-cyan-200/50 dark:border-cyan-800/30',    desc: 'Any language' },
] as const

type ActionId = typeof ACTIONS[number]['id']
const LANGS = [
  'French', 'Spanish', 'Arabic', 'German', 'Chinese', 'Japanese',
  'Hindi', 'Portuguese', 'Russian', 'Italian', 'Korean', 'Turkish',
  'Dutch', 'Swedish', 'Polish', 'Greek', 'Hebrew', 'Thai', 'Vietnamese',
  'Indonesian', 'Malay', 'Swahili', 'Yoruba', 'Hausa', 'Zulu',
]

function getApplyMode(action: string): 'replace' | 'insert' | 'title' {
  if (action === 'generate-title') return 'title'
  if (['improve', 'fix-grammar', 'make-professional', 'simplify', 'translate'].includes(action)) return 'replace'
  return 'insert'
}

export function AIPanel({ content, selection, noteTitle, onApply, onClose, onResultChange }: AIPanelProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [tags, setTags] = useState<string[] | null>(null)
  const [resultAction, setResultAction] = useState<string | null>(null)
  const [resultLabel, setResultLabel] = useState('')
  const [copied, setCopied] = useState(false)
  const [lang, setLang] = useState('French')
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [langSearch, setLangSearch] = useState('')
  const [prompt, setPrompt] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)

  const run = async (id: ActionId | 'generate-content') => {
    const text = selection || content
    if (!text.trim() && id !== 'generate-content') { toast.error('Note is empty'); return }
    setResult(null); setTags(null)
    setLoading(id)
    setResultLabel(id === 'generate-content' ? 'Generated Content' : ACTIONS.find(a => a.id === id)?.label ?? id)
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
      onResultChange?.(true)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'AI failed. Try again.')
      setResultAction(null)
    } finally { setLoading(null) }
  }

  const copy = () => {
    if (!result) return
    navigator.clipboard.writeText(result)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const accept = () => {
    if (!result || !resultAction) return
    onApply(result, getApplyMode(resultAction))
    onResultChange?.(false)
    onClose()
  }

  const dismiss = () => {
    setResult(null); setTags(null); setResultAction(null)
    onResultChange?.(false)
  }

  const hasResult = !!(result || tags)
  const canApply = !!result && resultAction !== 'generate-tags'

  // Keep run accessible in closures (lang picker setTimeout)
  const runRef = useRef<typeof run>(run)
  runRef.current = run

  // ── RESULT REVIEW SCREEN ─────────────────────────────────────────────────
  if (hasResult) {
    const mode = resultAction ? getApplyMode(resultAction) : 'insert'

    const modeConfig = {
      replace: {
        label: 'Replace Note',
        sub: 'This will overwrite your current content',
        btnClass: 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-violet-500/25',
        badgeClass: 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200/50',
        badgeText: 'Replaces current content',
      },
      insert: {
        label: 'Add to Note',
        sub: 'This will be appended to your note',
        btnClass: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/25',
        badgeClass: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/50',
        badgeText: 'Adds to note',
      },
      title: {
        label: 'Set as Title',
        sub: 'This will replace your note title',
        btnClass: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-blue-500/25',
        badgeClass: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/50',
        badgeText: 'Updates title',
      },
    }[mode]

    return (
      <div className="flex flex-col h-full bg-background">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60 shrink-0 bg-background/95 backdrop-blur-sm">
          <button
            onClick={dismiss}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-accent active:bg-accent/70 text-muted-foreground transition-all active:scale-[0.95] touch-manipulation"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-none">{resultLabel}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {noteTitle ? `"${noteTitle}"` : 'Review before applying'}
            </p>
          </div>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-border hover:bg-accent transition-all text-muted-foreground touch-manipulation active:scale-[0.96]"
          >
            {copied ? <><Check className="w-3.5 h-3.5 text-emerald-500" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
          </button>
        </div>

        {/* Mode badge */}
        <div className="px-4 py-3 shrink-0">
          <span className={cn(
            'inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border',
            modeConfig.badgeClass
          )}>
            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            {modeConfig.badgeText}
          </span>
        </div>

        {/* Result content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Tags */}
          {tags && (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span key={tag} className="text-sm px-3 py-1.5 rounded-full bg-primary/8 text-primary font-medium border border-primary/15">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Text result */}
          {result && (
            <div className="rounded-2xl border border-border/60 bg-muted/30 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/40 bg-muted/40 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground">AI Result</span>
              </div>
              <div className="px-4 py-4">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons — fixed bottom, large and always visible */}
        <div
          className="shrink-0 px-4 pt-3 space-y-2.5 border-t border-border/60 bg-background"
          style={{ paddingBottom: 'max(1.25rem, calc(env(safe-area-inset-bottom) + 0.75rem))' }}
        >
          {canApply && (
            <button
              onClick={accept}
              className={cn(
                'w-full h-14 rounded-2xl text-white font-bold text-[15px] flex items-center justify-center gap-2.5',
                'transition-all duration-200 active:scale-[0.98] touch-manipulation shadow-lg',
                modeConfig.btnClass
              )}
            >
              <CheckCheck className="w-5 h-5" />
              {modeConfig.label}
            </button>
          )}

          <button
            onClick={dismiss}
            className="w-full h-12 rounded-2xl border border-border bg-transparent hover:bg-muted/50 text-muted-foreground font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] touch-manipulation"
          >
            <X className="w-4 h-4" />
            Try again
          </button>
        </div>
      </div>
    )
  }

  // ── ACTIONS LIST ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background">

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border/60 shrink-0 bg-background/95 backdrop-blur-sm">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-primary/10 flex items-center justify-center border border-violet-200/40 dark:border-violet-800/30">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm leading-none">AI Actions</p>
          {noteTitle && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">"{noteTitle}"</p>}
        </div>
        {selection && (
          <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold border border-primary/15">
            Selection
          </span>
        )}
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-accent active:bg-accent/70 text-muted-foreground transition-all active:scale-[0.95] touch-manipulation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-primary/10 border border-violet-200/40 dark:border-violet-800/30 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm">{ACTIONS.find(a => a.id === loading)?.label ?? 'Processing'}…</p>
            <p className="text-xs text-muted-foreground mt-1">AI is working on your note</p>
          </div>
        </div>
      )}

      {/* Actions grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map(({ id, label, icon: Icon, color, bg, border, desc }) => (
            <button
              key={id}
              onClick={() => {
                if (id === 'translate') { setShowLangPicker(true); return }
                run(id)
              }}
              disabled={!!loading}
              className={cn(
                'flex flex-col items-start gap-2.5 p-3.5 rounded-2xl border bg-card',
                border,
                'hover:bg-accent/60 active:scale-[0.97] touch-manipulation',
                'transition-all duration-150 text-left disabled:opacity-40',
                'min-h-[88px]',
                id === 'translate' && lang !== 'French' && 'ring-1 ring-cyan-400/50'
              )}
            >
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', bg)}>
                <Icon className={cn('w-4 h-4', color)} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold leading-tight">{label}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {id === 'translate' ? `→ ${lang}` : desc}
                </p>
              </div>
            </button>
          ))}

          {/* Generate content */}
          <button
            onClick={() => setShowPrompt(v => !v)}
            disabled={!!loading}
            className="col-span-2 flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-primary/25 hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98] transition-all text-left touch-manipulation disabled:opacity-40"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/15">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">Generate Content</p>
              <p className="text-[11px] text-muted-foreground">Write anything from a prompt</p>
            </div>
            <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0', showPrompt && 'rotate-90')} />
          </button>
        </div>

        {/* Generate prompt */}
        {showPrompt && (
          <div className="mt-2 flex gap-2">
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
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40 hover:bg-primary/90 active:scale-[0.96] transition-all touch-manipulation"
            >
              Go
            </button>
          </div>
        )}

        {/* Translate picker — now an overlay, no static list needed */}
      </div>

      {/* Language picker overlay */}
      {showLangPicker && (
        <div className="absolute inset-0 z-20 flex flex-col bg-background">
          {/* Picker header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60 shrink-0">
            <button
              onClick={() => { setShowLangPicker(false); setLangSearch('') }}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-accent text-muted-foreground transition-all touch-manipulation active:scale-[0.95]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <p className="font-semibold text-sm leading-none">Choose Language</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Translate note to any language</p>
            </div>
          </div>

          {/* Search input */}
          <div className="px-3 py-2.5 border-b border-border/40 shrink-0">
            <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5 border border-border focus-within:border-primary transition-colors">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={langSearch}
                onChange={e => setLangSearch(e.target.value)}
                placeholder="Search language…"
                className="flex-1 bg-transparent text-sm outline-none"
              />
              {langSearch && (
                <button onClick={() => setLangSearch('')} className="text-muted-foreground hover:text-foreground touch-manipulation">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Language list */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {LANGS.filter(l => l.toLowerCase().includes(langSearch.toLowerCase())).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <Languages className="w-8 h-8 opacity-20" />
                <p className="text-sm">No language found for "{langSearch}"</p>
              </div>
            ) : (
              <div className="space-y-1">
                {LANGS.filter(l => l.toLowerCase().includes(langSearch.toLowerCase())).map(l => (
                  <button
                    key={l}
                    onClick={() => {
                      setLang(l)
                      setShowLangPicker(false)
                      setLangSearch('')
                      // Run translate immediately after picking language
                      setTimeout(() => runRef.current('translate'), 50)
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-left touch-manipulation active:scale-[0.98]',
                      lang === l
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-accent border border-transparent'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                      lang === l ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}>
                      {l.slice(0, 2).toUpperCase()}
                    </div>
                    <span className={cn('text-sm font-medium', lang === l && 'text-primary')}>{l}</span>
                    {lang === l && <Check className="w-4 h-4 text-primary ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
