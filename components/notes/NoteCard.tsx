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

function getPlainPreview(content: string): string {
  return content
    .replace(/"text":"([^"]+)"/g, '$1')
    .replace(/[{}[\]",]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)
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

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative overflow-hidden',
        'flex flex-col gap-3',
        'p-4 rounded-2xl',
        'border border-border/50',
        'bg-card',
        'cursor-pointer',
        'transition-all duration-200',
        'hover:-translate-y-1',
        'hover:border-primary/20',
        'hover:shadow-lg hover:shadow-primary/5',
        'hover:bg-gradient-to-br',
        'hover:from-background',
        'hover:to-muted/30'
      )}
    >
      {/* Pinned Accent */}
      {note.isPinned && (
        <div className="absolute left-0 top-0 h-full w-1 bg-primary rounded-l-2xl" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 text-foreground">
            {note.title || 'Untitled'}
          </h3>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'shrink-0 h-8 w-8 rounded-lg',
              'flex items-center justify-center',
              'text-muted-foreground',
              'hover:text-foreground',
              'hover:bg-muted',
              'transition-all',
              'opacity-60',
              'md:opacity-0 md:group-hover:opacity-100'
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
          <p className="text-sm leading-6 text-muted-foreground line-clamp-3">
            {preview}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground/50">
            Start writing...
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 mt-auto border-t border-border/30">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{timeAgo(note.updatedAt)}</span>

          <span>•</span>

          <span>
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {note.isFavorite && (
            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
          )}

          {note.isPinned && (
            <Pin className="h-3.5 w-3.5 text-primary" />
          )}
        </div>
      </div>
    </div>
  )
}