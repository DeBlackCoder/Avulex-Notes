'use client'
import type { Editor } from '@tiptap/react'
import { cn } from '@/lib/utils'
import {
  Bold, Italic, Underline, Strikethrough, Code, List, ListOrdered,
  CheckSquare, Quote, Link2, Table, Heading1, Heading2, Heading3,
  Undo, Redo, Minus
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'

interface Props { editor: Editor | null }

export function EditorToolbar({ editor }: Props) {
  if (!editor) return null

  const btn = (
    onClick: () => void,
    icon: React.ReactNode,
    label: string,
    active?: boolean
  ) => (
    <button
      key={label}
      onClick={onClick}
      title={label}
      type="button"
      className={cn(
        'p-1.5 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-accent',
        active && 'bg-accent text-foreground'
      )}
    >
      {icon}
    </button>
  )

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string
    const url = window.prompt('Enter URL', prev)
    if (url === null) return
    if (url === '') { editor.chain().focus().unsetLink().run(); return }
    if (!/^https?:\/\//i.test(url)) { alert('Please enter a full URL starting with http:// or https://'); return }
    editor.chain().focus().setLink({ href: url }).run()
  }

  const insertTable = () =>
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-4 py-2 border-b border-border bg-muted/30 sticky top-0 z-10">
      {btn(() => editor.chain().focus().undo().run(), <Undo className="w-4 h-4" />, 'Undo')}
      {btn(() => editor.chain().focus().redo().run(), <Redo className="w-4 h-4" />, 'Redo')}

      <Separator orientation="vertical" className="mx-1 h-5" />

      {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), <Heading1 className="w-4 h-4" />, 'H1', editor.isActive('heading', { level: 1 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="w-4 h-4" />, 'H2', editor.isActive('heading', { level: 2 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 className="w-4 h-4" />, 'H3', editor.isActive('heading', { level: 3 }))}

      <Separator orientation="vertical" className="mx-1 h-5" />

      {btn(() => editor.chain().focus().toggleBold().run(), <Bold className="w-4 h-4" />, 'Bold (Ctrl+B)', editor.isActive('bold'))}
      {btn(() => editor.chain().focus().toggleItalic().run(), <Italic className="w-4 h-4" />, 'Italic (Ctrl+I)', editor.isActive('italic'))}
      {btn(() => editor.chain().focus().toggleUnderline().run(), <Underline className="w-4 h-4" />, 'Underline', editor.isActive('underline'))}
      {btn(() => editor.chain().focus().toggleStrike().run(), <Strikethrough className="w-4 h-4" />, 'Strike', editor.isActive('strike'))}
      {btn(() => editor.chain().focus().toggleCode().run(), <Code className="w-4 h-4" />, 'Inline Code', editor.isActive('code'))}

      <Separator orientation="vertical" className="mx-1 h-5" />

      {btn(() => editor.chain().focus().toggleBulletList().run(), <List className="w-4 h-4" />, 'Bullet List', editor.isActive('bulletList'))}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="w-4 h-4" />, 'Ordered List', editor.isActive('orderedList'))}
      {btn(() => editor.chain().focus().toggleTaskList().run(), <CheckSquare className="w-4 h-4" />, 'Checklist', editor.isActive('taskList'))}

      <Separator orientation="vertical" className="mx-1 h-5" />

      {btn(() => editor.chain().focus().toggleBlockquote().run(), <Quote className="w-4 h-4" />, 'Quote', editor.isActive('blockquote'))}
      {btn(() => editor.chain().focus().toggleCodeBlock().run(), <Code className="w-4 h-4" />, 'Code Block', editor.isActive('codeBlock'))}
      {btn(setLink, <Link2 className="w-4 h-4" />, 'Link', editor.isActive('link'))}
      {btn(insertTable, <Table className="w-4 h-4" />, 'Table')}
      {btn(() => editor.chain().focus().setHorizontalRule().run(), <Minus className="w-4 h-4" />, 'Divider')}
    </div>
  )
}
