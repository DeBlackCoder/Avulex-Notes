'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDB } from '@/lib/db'
import type { LocalNote } from '@/lib/db'
import { generateId, wordCount } from '@/lib/utils'

export function useNotes(notebookId?: string) {
  return useQuery({
    queryKey: ['notes', notebookId],
    queryFn: async () => {
      if (typeof window === 'undefined') return []
      const db = getDB()
      const notes = await db.notes
        .filter(n => !n.isTrashed && !n.isArchived && (notebookId ? n.notebookId === notebookId : true))
        .sortBy('updatedAt')
      return notes.reverse()
    },
    staleTime: 1000,
  })
}

export function useTrashedNotes() {
  return useQuery({
    queryKey: ['notes', 'trash'],
    queryFn: async () => {
      if (typeof window === 'undefined') return []
      const db = getDB()
      return db.notes.filter(n => n.isTrashed).sortBy('updatedAt')
    },
  })
}

export function useArchivedNotes() {
  return useQuery({
    queryKey: ['notes', 'archived'],
    queryFn: async () => {
      if (typeof window === 'undefined') return []
      const db = getDB()
      return db.notes.filter(n => n.isArchived && !n.isTrashed).sortBy('updatedAt')
    },
  })
}

export function useNote(id: string) {
  return useQuery({
    queryKey: ['note', id],
    queryFn: async () => {
      if (typeof window === 'undefined') return null
      const db = getDB()
      return db.notes.get(id)
    },
    enabled: !!id,
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<LocalNote> & { notebookId: string }) => {
      const db = getDB()
      const note: LocalNote = {
        id: generateId(),
        notebookId: data.notebookId,
        folderId: data.folderId || null,
        title: data.title || 'Untitled',
        content: data.content || '',
        wordCount: wordCount(data.content || ''),
        isFavorite: false,
        isPinned: false,
        isArchived: false,
        isTrashed: false,
        trashedAt: null,
        originalNotebookId: null,
        originalFolderId: null,
        updatedAt: Date.now(),
        createdAt: Date.now(),
        synced: false,
      }
      await db.notes.add(note)
      return note
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: Partial<LocalNote> }) => {
      const db = getDB()
      await db.notes.update(id, { ...changes, updatedAt: Date.now(), synced: false })
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      qc.invalidateQueries({ queryKey: ['note', id] })
    },
  })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const db = getDB()
      await db.notes.delete(id)
      await db.versionHistory.where('noteId').equals(id).delete()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  })
}
