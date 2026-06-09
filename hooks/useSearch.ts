'use client'
import { useState, useCallback, useEffect } from 'react'
import { getDB, type LocalNote } from '@/lib/db'

export interface SearchResult {
  note: LocalNote
  excerpt: string
  matchType: 'title' | 'body'
}

export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setIsSearching(true)
    const db = getDB()
    const allNotes = await db.notes.filter(n => !n.isTrashed && !n.isArchived).toArray()
    const ql = q.toLowerCase()

    const titleMatches: SearchResult[] = []
    const bodyMatches: SearchResult[] = []

    for (const note of allNotes) {
      const titleL = note.title.toLowerCase()
      const contentL = note.content.toLowerCase()
      if (titleL.includes(ql)) {
        titleMatches.push({ note, excerpt: note.title, matchType: 'title' })
      } else if (contentL.includes(ql)) {
        const idx = contentL.indexOf(ql)
        const start = Math.max(0, idx - 80)
        const end = Math.min(note.content.length, idx + 120)
        titleMatches.push({ note, excerpt: '...' + note.content.slice(start, end) + '...', matchType: 'body' })
        bodyMatches.push({ note, excerpt: '...' + note.content.slice(start, end) + '...', matchType: 'body' })
      }
    }

    setResults([...titleMatches.filter(r => r.matchType === 'title'), ...bodyMatches])
    setIsSearching(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 150)
    return () => clearTimeout(t)
  }, [query, search])

  return { query, setQuery, results, isSearching }
}
