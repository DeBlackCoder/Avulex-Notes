'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { getDB } from '@/lib/db'
import { useQueryClient } from '@tanstack/react-query'

export type SyncStatus = 'synced' | 'syncing' | 'queued' | 'error' | 'offline'

export function useSync(userId: string | null) {
  const [status, setStatus] = useState<SyncStatus>('synced')
  const [lastSync, setLastSync] = useState<number | null>(null)
  const qc = useQueryClient()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const syncingRef = useRef(false)

  const syncNotes = useCallback(async () => {
    if (!userId || !navigator.onLine || syncingRef.current) return
    syncingRef.current = true

    try {
      setStatus('syncing')
      const db = getDB()

      // Sync unsynced notebooks
      const unsyncedNotebooks = await db.notebooks.filter(n => !n.synced).toArray()
      for (const nb of unsyncedNotebooks) {
        try {
          const res = await fetch(`/api/notebooks/${nb.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: nb.name,
              workspaceId: nb.workspaceId,
              updatedAt: new Date(nb.updatedAt),
            }),
          })
          if (res.ok) await db.notebooks.update(nb.id, { synced: true })
        } catch { /* skip, retry next time */ }
      }

      // Sync unsynced notes
      const unsyncedNotes = await db.notes.filter(n => !n.synced).toArray()
      for (const note of unsyncedNotes) {
        try {
          const res = await fetch(`/api/notes/${note.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              notebookId: note.notebookId,
              folderId: note.folderId,
              title: note.title,
              wordCount: note.wordCount,
              isFavorite: note.isFavorite,
              isPinned: note.isPinned,
              isArchived: note.isArchived,
              isTrashed: note.isTrashed,
              trashedAt: note.trashedAt ? new Date(note.trashedAt) : null,
              originalNotebookId: note.originalNotebookId,
              updatedAt: new Date(note.updatedAt),
            }),
          })
          if (res.ok) await db.notes.update(note.id, { synced: true })
        } catch { /* skip, retry next time */ }
      }

      setStatus('synced')
      setLastSync(Date.now())
      qc.invalidateQueries({ queryKey: ['notes'] })
    } catch {
      setStatus('error')
    } finally {
      syncingRef.current = false
    }
  }, [userId, qc])

  useEffect(() => {
    if (!userId) return
    // Initial sync after a short delay to let the app settle
    const t = setTimeout(syncNotes, 2000)
    intervalRef.current = setInterval(syncNotes, 30000)
    window.addEventListener('online', syncNotes)
    return () => {
      clearTimeout(t)
      if (intervalRef.current) clearInterval(intervalRef.current)
      window.removeEventListener('online', syncNotes)
    }
  }, [userId, syncNotes])

  // Update status when offline
  useEffect(() => {
    const handleOffline = () => setStatus('offline')
    const handleOnline = () => { if (status === 'offline') setStatus('synced') }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [status])

  return { status, lastSync, syncNow: syncNotes }
}
