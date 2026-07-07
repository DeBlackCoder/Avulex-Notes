'use client'

import { useRouter } from 'next/navigation'
import type { LocalNote } from '@/lib/db'
import { cn, timeAgo, generateId, truncateTitle } from '@/lib/utils'
import { useUpdateNote } from '@/hooks/useNotes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Star,
  Pin,
  Archive,
  Trash2,
  Copy,
  MoreHorizontal,
  StarOff,
  PinOff,
  ArchiveRestore,
} from 'lucide-react'
import { toast } from 'sonner'
import { getDB } from '@/lib/db'

interface Props {
  note: LocalNote
  onClick?: () => void
}

/**
 * Extract clean readable text from Tiptap JSON content.
 * Properly walks the node tree to get only text content in reading order.
 */
function extractTiptapText(content: string): string {
  if (!content) return ''
  try {
    const doc = JSON.parse(content)
    const parts: string[] = []

    function walk(node: { type?: string; text?: string; content?: unknown[] }) {
      if (node.type === 'text' && node.text) {
        parts.push(node.text)
      }
      if (Array.isArray(node.content)) {
        for (const child of node.content) {
          walk(child as { type?: string; text?: string; content?: unknown[] })
        }
        // Add spacing after block-level nodes
        const blockTypes = ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'taskItem', 'blockquote', 'codeBlock']
        if (node.type && blockTypes.includes(node.type)) {
          parts.push(' ')
        }
      }
    }

    walk(doc)
    return parts.join('').replace(/\s+/g, ' ').trim()
  } catch {
    // Fallback: strip JSON structure manually
    return content
      .replace(/"text":"([^"\\]*(\\.[^"\\]*)*)"/g, (_, t) => t + ' ')
      .replace(/[{}\[\]",:\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
}

function getPlainPreview(content: string): string {
  return extractTiptapText(content).slice(0, 200)
}

// Generate a deterministic accent color from the note id/title
const ACCENT_GRADIENTS = [
  'from-violet-500/80 to-blue-500/80',
  'from-blue-500/80 to-cyan-500/80',
  'from-emerald-500/80 to-teal-500/80',
  'from-amber-500/80 to-orange-500/80',
  'from-pink-500/80 to-rose-500/80',
  'from-purple-500/80 to-indigo-500/80',
]

function getNoteAccent(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return ACCENT_GRADIENTS[hash % ACCENT_GRADIENTS.length]
}

export function NoteCard({ note, onClick }: Props) {
  const router = useRouter()
  const updateNote = useUpdateNote()

  const handleClick = () => {
    onClick?.()
    router.push(`/notes/${note.id}`)
  }

  const toggle = async (
    field: keyof LocalNote,
    value: unknown,
    message: string
  ) => {
    await updateNote.mutateAsync({
      id: note.id,
      changes: { [field]: value } as Partial<LocalNote>,
    })

    toast.success(message)
  }

  const duplicate = async () => {
    const db = getDB()

    const newNote: LocalNote = {
      ...note,
      id: generateId(),
      title: truncateTitle(note.title, ' (Copy)'),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      synced: false,
    }

    await db.notes.add(newNote)

    toast.success('Note duplicated')
    router.push(`/notes/${newNote.id}`)
  }

  const preview = note.content
    ? getPlainPreview(note.content)
    : ''

  const wordCount = preview
    ? preview.split(/\s+/).filter(Boolean).length
    : 0

  const accent = getNoteAccent(note.id)

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative overflow-hidden',
        'flex flex-col',
        'rounded-2xl',
        'border border-border/60',
        'bg-card',
        'cursor-pointer touch-manipulation',
        'transition-all duration-150',
        'active:scale-[0.97]',
        'hover:border-primary/20',
        'hover:shadow-lg hover:shadow-black/5',
        'dark:hover:shadow-black/20',
        'min-h-[140px]'
      )}
    >
      {/* Gradient top accent bar */}
      <div className={cn('h-1 w-full bg-gradient-to-r shrink-0', accent)} />

      {/* Pinned left accent */}
      {note.isPinned && (
        <div className="absolute left-0 top-1 bottom-0 w-[3px] bg-primary rounded-r-full" />
      )}

      {/* Card body */}
      <div className="flex flex-col gap-2.5 p-4 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 text-foreground flex-1 min-w-0">
            {note.title || 'Untitled'}
          </h3>

          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'shrink-0 h-9 w-9 rounded-xl',
                'flex items-center justify-center',
                'text-muted-foreground',
                'hover:text-foreground',
                'hover:bg-muted',
                'active:bg-muted/80',
                'transition-all duration-150',
                'active:scale-[0.95]',
                // Always visible on mobile, hover on desktop
                'opacity-70 md:opacity-0 md:group-hover:opacity-100',
                'touch-manipulation'
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-48"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                onClick={() =>
                  toggle(
                    'isFavorite',
                    !note.isFavorite,
                    note.isFavorite
                      ? 'Removed from favorites'
                      : 'Added to favorites'
                  )
                }
              >
                {note.isFavorite ? (
                  <StarOff className="mr-2 h-4 w-4" />
                ) : (
                  <Star className="mr-2 h-4 w-4" />
                )}
                {note.isFavorite ? 'Unfavorite' : 'Favorite'}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() =>
                  toggle(
                    'isPinned',
                    !note.isPinned,
                    note.isPinned ? 'Unpinned' : 'Pinned'
                  )
                }
              >
                {note.isPinned ? (
                  <PinOff className="mr-2 h-4 w-4" />
                ) : (
                  <Pin className="mr-2 h-4 w-4" />
                )}
                {note.isPinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>

              <DropdownMenuItem onClick={duplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() =>
                  toggle(
                    'isArchived',
                    !note.isArchived,
                    note.isArchived
                      ? 'Unarchived'
                      : 'Archived'
                  )
                }
              >
                {note.isArchived ? (
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                ) : (
                  <Archive className="mr-2 h-4 w-4" />
                )}
                {note.isArchived ? 'Unarchive' : 'Archive'}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() =>
                  toggle(
                    'isTrashed',
                    true,
                    'Moved to Trash'
                  )
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Move to Trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Preview */}
        <div className="flex-1">
          {preview ? (
            <p className="text-sm leading-5 text-muted-foreground line-clamp-3">
              {preview}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground/40">
              Start writing...
            </p>
          )}
        </div>

        {/* Footer metadata row */}
        <div className="flex items-center justify-between pt-2 mt-auto border-t border-border/30">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{timeAgo(note.updatedAt)}</span>
            <span>·</span>
            <span>{wordCount}w</span>
          </div>

          <div className="flex items-center gap-1.5">
            {note.isFavorite && (
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            )}
            {note.isPinned && (
              <Pin className="h-3.5 w-3.5 text-primary fill-primary/20" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
