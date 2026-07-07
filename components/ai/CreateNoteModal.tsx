'use client'
import { useState } from 'react'
import { Sparkles, X, Loader2, FileText, AlignLeft, List, AlignJustify, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface Props {
  open: boolean
  onClose: () => void
  /** Called with generated content + suggested title so parent can create & open the note */
  onCreate: (title: string, content: string) => void
}

type Style = 'mixed' | 'bullet' | 'essay'
type Length = 'short' | 'medium' | 'long'

const STYLES: { key: Style; label: string; icon: React.ElementType; desc: string }[] = [
  { key: 'mixed',  label: 'Mixed',   icon: AlignJustify, desc: 'Paragraphs + lists' },
  { key: 'bullet', label: 'Bullets', icon: List,         desc: 'Scannable lists' },
  { key: 'essay',  label: 'Essay',   icon: AlignLeft,    desc: 'Flowing prose' },
]

const LENGTHS: { key: Length; label: string; desc: string }[] = [
  { key: 'short',  label: 'Short',  desc: '~250 words' },
  { key: 'medium', label: 'Medium', desc: '~400 words' },
  { key: 'long',   label: 'Long',   desc: '~750 words' },
]

const TOPIC_SUGGESTIONS = [
  'How to build a morning routine',
  'Introduction to machine learning',
  'Project management best practices',
  'Healthy eating on a budget',
  'The history of the internet',
  'How to negotiate a raise',
]

export function CreateNoteModal({ open, onClose, onCreate }: Props) {
  const [topic, setTopic] = useState('')
  const [title, setTitle] = useState('')
  const [style, setStyle] = useState<Style>('mixed')
  const [length, setLength] = useState<Length>('medium')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setTopic('')
    setTitle('')
    setStyle('mixed')
    setLength('medium')
    setError(null)
    setLoading(false)
  }

  const handleClose = () => { reset(); onClose() }

  const generate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/create-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), title: title.trim() || undefined, style, length }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      onCreate(data.suggestedTitle || topic.trim(), data.content)
      handleClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-3xl border-border/60 mx-4">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60 bg-gradient-to-r from-violet-500/5 to-primary/5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-primary/10 flex items-center justify-center border border-violet-200/40 dark:border-violet-800/30">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm leading-none">AI Note Creator</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Generate a full note from any topic</p>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-accent text-muted-foreground transition-all touch-manipulation">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[70vh]">

          {/* Topic input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" />
              Topic <span className="text-destructive">*</span>
            </label>
            <input
              autoFocus
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && topic.trim() && generate()}
              placeholder="e.g. How photosynthesis works"
              className="w-full text-sm bg-muted rounded-2xl px-4 py-3 outline-none border border-border focus:border-primary transition-colors placeholder:text-muted-foreground/50"
            />
            {/* Topic suggestions */}
            {!topic && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {TOPIC_SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setTopic(s)}
                    className="text-[11px] px-2.5 py-1.5 rounded-xl bg-muted border border-border hover:border-primary/40 hover:bg-accent text-muted-foreground transition-all touch-manipulation active:scale-[0.97] truncate max-w-[160px]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title input (optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              Note title <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Leave blank to auto-generate"
              className="w-full text-sm bg-muted rounded-2xl px-4 py-3 outline-none border border-border focus:border-primary transition-colors placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Style */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">Writing style</label>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map(({ key, label, icon: Icon, desc }) => (
                <button
                  key={key}
                  onClick={() => setStyle(key)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border transition-all text-center touch-manipulation active:scale-[0.97]',
                    style === key
                      ? 'border-primary/50 bg-primary/8 text-primary'
                      : 'border-border bg-card hover:bg-accent text-muted-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-semibold">{label}</span>
                  <span className="text-[10px] leading-none opacity-70">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Length */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">Length</label>
            <div className="grid grid-cols-3 gap-2">
              {LENGTHS.map(({ key, label, desc }) => (
                <button
                  key={key}
                  onClick={() => setLength(key)}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 px-2 rounded-2xl border transition-all text-center touch-manipulation active:scale-[0.97]',
                    length === key
                      ? 'border-primary/50 bg-primary/8 text-primary'
                      : 'border-border bg-card hover:bg-accent text-muted-foreground'
                  )}
                >
                  <span className="text-xs font-semibold">{label}</span>
                  <span className="text-[10px] opacity-70">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-destructive/8 border border-destructive/20 text-destructive text-xs">
              <X className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-border/60 space-y-2">
          <button
            onClick={generate}
            disabled={!topic.trim() || loading}
            className={cn(
              'w-full h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2.5 transition-all',
              'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25',
              'hover:from-violet-700 hover:to-purple-700 active:scale-[0.98] touch-manipulation',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100'
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating note…
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Note
              </>
            )}
          </button>
          <button
            onClick={handleClose}
            disabled={loading}
            className="w-full h-11 rounded-2xl border border-border text-muted-foreground text-sm font-medium hover:bg-muted transition-all touch-manipulation active:scale-[0.98] disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
