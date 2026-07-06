'use client'
import { useState, useCallback, useEffect } from 'react'
import { getDB, type LocalNote, type LocalNotebook } from '@/lib/db'

export interface NoteSearchResult {
  type: 'note'
  note: LocalNote
  notebookName: string
  excerpt: string
  matchType: 'title' | 'body'
}

export interface NotebookSearchResult {
  type: 'notebook'
  notebook: LocalNotebook
  noteCount: number
}

export type SearchResult = NoteSearchResult | NotebookSearchResult

// Extract readable text from Tiptap JSON string
function extractText(content: string): string {
  if (!content) return ''
  try {
    // Strip Tiptap JSON structure, keep only text values
    return content
      .replace(/"text":"([^"\\]*(\\.[^"\\]*)*)"/g, (_, t) => t + ' ')
      .replace(/\\n/g, ' ')
      .replace(/[{}\[\],"]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  } catch {
    return content
  }
}

export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    if (typeof window === 'undefined') return

    setIsSearching(true)
    const db = getDB()

    const [allNotes, allNotebooks] = await Promise.all([
      db.notes.filter(n => !n.isTrashed && !n.isArchived).toArray(),
      db.notebooks.toArray(),
    ])

    const ql = q.toLowerCase()

    // Build notebook lookup
    const nbMap: Record<string, LocalNotebook> = {}
    for (const nb of allNotebooks) nbMap[nb.id] = nb

    // Count notes per notebook
    const nbNoteCount: Record<string, number> = {}
    for (const n of allNotes) {
      nbNoteCount[n.notebookId] = (nbNoteCount[n.notebookId] || 0) + 1
    }

    const titleMatches: NoteSearchResult[] = []
    const bodyMatches: NoteSearchResult[] = []

    for (const note of allNotes) {
      const titleL = note.title.toLowerCase()
      const plainText = extractText(note.content)
      const bodyL = plainText.toLowerCase()
      const notebookName = nbMap[note.notebookId]?.name || ''

      if (titleL.includes(ql)) {
        titleMatches.push({
          type: 'note',
          note,
          notebookName,
          excerpt: note.title,
          matchType: 'title',
        })
      } else if (bodyL.includes(ql)) {
        const idx = bodyL.indexOf(ql)
        const start = Math.max(0, idx - 80)
        const end = Math.min(plainText.length, idx + 120)
        bodyMatches.push({
          type: 'note',
          note,
          notebookName,
          excerpt: (start > 0 ? '…' : '') + plainText.slice(start, end) + (end < plainText.length ? '…' : ''),
          matchType: 'body',
        })
      }
    }

    // Notebook name matches
    const notebookMatches: NotebookSearchResult[] = allNotebooks
      .filter(nb => nb.name.toLowerCase().includes(ql))
      .map(nb => ({
        type: 'notebook' as const,
        notebook: nb,
        noteCount: nbNoteCount[nb.id] || 0,
      }))

    // Order: title matches → notebook matches → body matches
    setResults([...titleMatches, ...notebookMatches, ...bodyMatches])
    setIsSearching(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 150)
    return () => clearTimeout(t)
  }, [query, search])

  return { query, setQuery, results, isSearching }
}
