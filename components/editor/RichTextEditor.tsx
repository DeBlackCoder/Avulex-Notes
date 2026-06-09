'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { all, createLowlight } from 'lowlight'
import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { cn, wordCount, readingTime } from '@/lib/utils'
import { EditorToolbar } from './EditorToolbar'

const lowlight = createLowlight(all)

// Commands exposed to parent via ref
export interface EditorHandle {
  /** Replace entire note content with plain text (preserves markdown-like structure) */
  replaceContent: (text: string) => void
  /** Append text at the end of the document */
  appendContent: (text: string) => void
  /** Replace current selection with text, or append if no selection */
  insertAtCursor: (text: string) => void
  /** Get current plain text */
  getPlainText: () => string
  /** Get current JSON */
  getJSON: () => string
  /** Focus the editor */
  focus: () => void
}

interface Props {
  content: string
  onChange: (json: string, text: string) => void
  onSave: () => void
  placeholder?: string
  className?: string
  editable?: boolean
}

/**
 * Parse plain text with markdown-ish formatting into Tiptap JSON.
 * Handles headings (## / ### / ####), bullet lists (- / *), numbered lists,
 * checkboxes (- [ ] / - [x]), bold (**text**), code blocks (```), blockquotes (>),
 * and plain paragraphs.
 */
function markdownToTiptap(text: string): object {
  const lines = text.split('\n')
  const content: object[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || 'text'
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      content.push({
        type: 'codeBlock',
        attrs: { language: lang },
        content: [{ type: 'text', text: codeLines.join('\n') }],
      })
      i++
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3
      content.push({
        type: 'heading',
        attrs: { level },
        content: parseInline(headingMatch[2]),
      })
      i++
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      content.push({
        type: 'blockquote',
        content: [{ type: 'paragraph', content: parseInline(line.slice(2)) }],
      })
      i++
      continue
    }

    // Task list item
    const taskMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)/)
    if (taskMatch) {
      const items: object[] = []
      let j = i
      while (j < lines.length && lines[j].match(/^[-*]\s+\[([ xX])\]\s+/)) {
        const m = lines[j].match(/^[-*]\s+\[([ xX])\]\s+(.+)/)!
        items.push({
          type: 'taskItem',
          attrs: { checked: m[1].toLowerCase() === 'x' },
          content: [{ type: 'paragraph', content: parseInline(m[2]) }],
        })
        j++
      }
      content.push({ type: 'taskList', content: items })
      i = j
      continue
    }

    // Bullet list
    const bulletMatch = line.match(/^[-*]\s+(.+)/)
    if (bulletMatch) {
      const items: object[] = []
      let j = i
      while (j < lines.length && lines[j].match(/^[-*]\s+/) && !lines[j].match(/^[-*]\s+\[/)) {
        const m = lines[j].match(/^[-*]\s+(.+)/)!
        items.push({ type: 'listItem', content: [{ type: 'paragraph', content: parseInline(m[1]) }] })
        j++
      }
      content.push({ type: 'bulletList', content: items })
      i = j
      continue
    }

    // Numbered list
    const numMatch = line.match(/^\d+\.\s+(.+)/)
    if (numMatch) {
      const items: object[] = []
      let j = i
      while (j < lines.length && lines[j].match(/^\d+\.\s+/)) {
        const m = lines[j].match(/^\d+\.\s+(.+)/)!
        items.push({ type: 'listItem', content: [{ type: 'paragraph', content: parseInline(m[1]) }] })
        j++
      }
      content.push({ type: 'orderedList', content: items })
      i = j
      continue
    }

    // Horizontal rule
    if (line.match(/^[-*_]{3,}$/)) {
      content.push({ type: 'horizontalRule' })
      i++
      continue
    }

    // Empty line → paragraph separator (skip)
    if (line.trim() === '') {
      i++
      continue
    }

    // Regular paragraph
    content.push({ type: 'paragraph', content: parseInline(line) })
    i++
  }

  return { type: 'doc', content: content.length > 0 ? content : [{ type: 'paragraph' }] }
}

/** Parse inline markdown: bold, italic, inline code */
function parseInline(text: string): object[] {
  const nodes: object[] = []
  // Split on bold (**...**), italic (*...*), inline code (`...`)
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > last) {
      nodes.push({ type: 'text', text: text.slice(last, match.index) })
    }
    if (match[0].startsWith('**')) {
      nodes.push({ type: 'text', text: match[2], marks: [{ type: 'bold' }] })
    } else if (match[0].startsWith('*')) {
      nodes.push({ type: 'text', text: match[3], marks: [{ type: 'italic' }] })
    } else if (match[0].startsWith('`')) {
      nodes.push({ type: 'text', text: match[4], marks: [{ type: 'code' }] })
    }
    last = match.index + match[0].length
  }
  if (last < text.length) {
    nodes.push({ type: 'text', text: text.slice(last) })
  }
  return nodes.length > 0 ? nodes : [{ type: 'text', text }]
}

export const RichTextEditor = forwardRef<EditorHandle, Props>(function RichTextEditor(
  { content, onChange, onSave, placeholder = 'Start writing…', className, editable = true },
  ref
) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline cursor-pointer' } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      CodeBlockLowlight.configure({ lowlight, HTMLAttributes: { class: 'rounded-lg bg-zinc-900 text-zinc-100 p-4 font-mono text-sm' } }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: content ? (() => { try { return JSON.parse(content) } catch { return content } })() : '',
    editable,
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON())
      const text = editor.getText()
      onChange(json, text)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => onSave(), 1000)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-zinc dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-1',
      },
    },
  })

  // Expose commands to parent
  useImperativeHandle(ref, () => ({
    replaceContent: (text: string) => {
      if (!editor) return
      try {
        const doc = markdownToTiptap(text)
        editor.commands.setContent(doc)
        editor.commands.focus('end')
      } catch {
        editor.commands.setContent(`<p>${text}</p>`)
      }
    },
    appendContent: (text: string) => {
      if (!editor) return
      editor.commands.focus('end')
      // Add a separator then the content
      try {
        const doc = markdownToTiptap(text)
        const nodes = (doc as { content: object[] }).content
        // Insert a paragraph separator first
        editor.chain().focus('end').insertContent([
          { type: 'paragraph' },
          ...nodes,
        ]).run()
      } catch {
        editor.chain().focus('end').insertContent(`<p>${text}</p>`).run()
      }
    },
    insertAtCursor: (text: string) => {
      if (!editor) return
      const { from, to } = editor.state.selection
      const hasSelection = from !== to
      if (hasSelection) {
        // Replace selection
        try {
          const doc = markdownToTiptap(text)
          const nodes = (doc as { content: object[] }).content
          editor.chain().focus().deleteSelection().insertContent(nodes).run()
        } catch {
          editor.chain().focus().deleteSelection().insertContent(text).run()
        }
      } else {
        // Append at end
        try {
          const doc = markdownToTiptap(text)
          const nodes = (doc as { content: object[] }).content
          editor.chain().focus('end').insertContent([{ type: 'paragraph' }, ...nodes]).run()
        } catch {
          editor.chain().focus('end').insertContent(text).run()
        }
      }
    },
    getPlainText: () => editor?.getText() ?? '',
    getJSON: () => editor ? JSON.stringify(editor.getJSON()) : '',
    focus: () => editor?.commands.focus(),
  }), [editor])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); onSave() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSave])

  // Sync external content
  useEffect(() => {
    if (!editor || !content) return
    try {
      const parsed = JSON.parse(content)
      if (JSON.stringify(parsed) !== JSON.stringify(editor.getJSON())) {
        editor.commands.setContent(parsed)
      }
    } catch { /* ignore */ }
  }, [content, editor])

  const words = editor ? wordCount(editor.getText()) : 0
  const chars = editor?.storage.characterCount.characters() ?? 0
  const minutes = readingTime(words)

  if (!mounted) return (
    <div className={cn('flex flex-col h-full items-center justify-center', className)}>
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {editable && <EditorToolbar editor={editor} />}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <EditorContent editor={editor} />
      </div>
      {editable && (
        <div className="flex items-center gap-4 px-6 py-2 border-t border-border text-xs text-muted-foreground bg-muted/30">
          <span>{words} words</span>
          <span>{chars} chars</span>
          <span>{minutes} min read</span>
        </div>
      )}
    </div>
  )
})
