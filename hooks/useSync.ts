'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { getDB, type LocalNote, type LocalNotebook, type LocalWorkspace } from '@/lib/db'
import { useQueryClient } from '@tanstack/react-query'

export type SyncStatus = 'synced' | 'syncing' | 'pulling' | 'queued' | 'error' | 'offline'

function mongoNoteToLocal(n: Record<string, unknown>): LocalNote {
  return {
    id: String(n._id),
    notebookId: String(n.notebookId || ''),
    folderId: n.folderId ? String(n.folderId) : null,
    title: String(n.title || ''),
    content: String(n.content || ''),
    wordCount: Number(n.wordCount || 0),
    isFavorite: Boolean(n.isFavorite),
    isPinned: Boolean(n.isPinned),
    isArchived: Boolean(n.isArchived),
    isTrashed: Boolean(n.isTrashed),
    trashedAt: n.trashedAt ? new Date(n.trashedAt as string).getTime() : null,
    originalNotebookId: n.originalNotebookId ? String(n.originalNotebookId) : null,
    originalFolderId: n.originalFolderId ? String(n.originalFolderId) : null,
    updatedAt: n.updatedAt ? new Date(n.updatedAt as string).getTime() : Date.now(),
    createdAt: n.createdAt ? new Date(n.createdAt as string).getTime() : Date.now(),
    synced: true,
  }
}

function mongoNotebookToLocal(n: Record<string, unknown>): LocalNotebook {
  return {
    id: String(n._id),
    workspaceId: String(n.workspaceId || ''),
    name: String(n.name || 'Untitled'),
    updatedAt: n.updatedAt ? new Date(n.updatedAt as string).getTime() : Date.now(),
    synced: true,
  }
}

function mongoWorkspaceToLocal(w: Record<string, unknown>): LocalWorkspace {
  return {
    id: String(w._id),
    userId: String(w.userId || ''),
    name: String(w.name || 'My Workspace'),
    updatedAt: w.updatedAt ? new Date(w.updatedAt as string).getTime() : Date.now(),
  }
}

export function useSync(userId: string | null) {
  const [status, setStatus] = useState<SyncStatus>('synced')
  const [lastSync, setLastSync] = useState<number | null>(null)
  const qc = useQueryClient()
  const syncingRef = useRef(false)

  /**
   * PULL from server → write into IndexedDB.
   * Always runs on load to restore data on new devices and
   * keep data up to date from other devices.
   * Server wins for notes that are newer server-side.
   * Local wins for notes that are newer client-side (unsaved edits).
   */
  const pullFromServer = useCallback(async () => {
    if (!userId || typeof window === 'undefined') return
    if (!navigator.onLine) return

    setStatus('pulling')
    try {
      const res = await fetch('/api/sync/pull')
      if (!res.ok) throw new Error('Pull failed: ' + res.status)
      const { notebooks, notes, workspaces } = await res.json()

      const db = getDB()

      for (const w of (workspaces || [])) {
        await db.workspaces.put(mongoWorkspaceToLocal(w as Record<string, unknown>))
      }

      for (const nb of (notebooks || [])) {
        const local = mongoNotebookToLocal(nb as Record<string, unknown>)
        const existing = await db.notebooks.get(local.id)
        // Only overwrite if server is newer or doesn't exist locally
        if (!existing || new Date(nb.updatedAt as string).getTime() >= existing.updatedAt) {
          await db.notebooks.put(local)
        }
      }

      for (const note of (notes || [])) {
        const local = mongoNoteToLocal(note as Record<string, unknown>)
        const existing = await db.notes.get(local.id)
        // Server wins if it's newer AND local copy is already synced
        // Local wins if it has unsynced edits (user typed on this device)
        if (!existing) {
          await db.notes.put(local)
        } else if (existing.synced && local.updatedAt > existing.updatedAt) {
          await db.notes.put(local)
        }
        // else: keep local (it has newer unsynced changes)
      }

      qc.invalidateQueries({ queryKey: ['notes'] })
      qc.invalidateQueries({ queryKey: ['notebooks'] })
      setStatus('synced')
      setLastSync(Date.now())
    } catch (e) {
      console.error('[sync] pull error:', e)
      setStatus('error')
    }
  }, [userId, qc])

  /**
   * PUSH local unsynced changes → server.
   */
  const pushToServer = useCallback(async () => {
    if (!userId || typeof window === 'undefined') return
    if (!navigator.onLine || syncingRef.current) return
    syncingRef.current = true

    try {
      const db = getDB()

      const unsyncedNbs = await db.notebooks.filter(n => !n.synced).toArray()
      for (const nb of unsyncedNbs) {
        try {
          const res = await fetch(`/api/notebooks/${nb.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: nb.name, workspaceId: nb.workspaceId, updatedAt: new Date(nb.updatedAt) }),
          })
          if (res.ok) await db.notebooks.update(nb.id, { synced: true })
        } catch { /* retry next cycle */ }
      }

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
              content: note.content,
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
        } catch { /* retry next cycle */ }
      }

      if (unsyncedNbs.length > 0 || unsyncedNotes.length > 0) {
        setStatus('synced')
        setLastSync(Date.now())
        qc.invalidateQueries({ queryKey: ['notes'] })
        qc.invalidateQueries({ queryKey: ['notebooks'] })
      }
    } catch (e) {
      console.error('[sync] push error:', e)
      setStatus('error')
    } finally {
      syncingRef.current = false
    }
  }, [userId, qc])

  /**
   * Full bidirectional sync: push first (save local changes),
   * then pull (restore data from other devices).
   */
  const fullSync = useCallback(async () => {
    if (!userId || !navigator.onLine) return
    setStatus('syncing')
    await pushToServer()
    await pullFromServer()
  }, [userId, pushToServer, pullFromServer])

  useEffect(() => {
    if (!userId) return

    // Immediate full sync on sign-in
    fullSync()

    // Pull every 60s to catch changes from other devices
    const pullInterval = setInterval(pullFromServer, 60_000)
    // Push every 15s to flush local edits quickly
    const pushInterval = setInterval(pushToServer, 15_000)

    window.addEventListener('online', fullSync)

    // Throttle focus-triggered pull to once per 30s to avoid spamming
    let lastFocusPull = 0
    const onFocus = () => {
      const now = Date.now()
      if (now - lastFocusPull > 30_000) {
        lastFocusPull = now
        pullFromServer()
      }
    }
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(pullInterval)
      clearInterval(pushInterval)
      window.removeEventListener('online', fullSync)
      window.removeEventListener('focus', onFocus)
    }
  }, [userId, fullSync, pullFromServer, pushToServer])

  useEffect(() => {
    const goOffline = () => setStatus('offline')
    const goOnline = () => fullSync()
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [fullSync])

  return { status, lastSync, syncNow: fullSync, pullNow: pullFromServer }
}
