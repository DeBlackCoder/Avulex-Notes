import Dexie, { type Table } from 'dexie'

export interface LocalNote {
  id: string
  notebookId: string
  folderId: string | null
  title: string
  content: string
  wordCount: number
  isFavorite: boolean
  isPinned: boolean
  isArchived: boolean
  isTrashed: boolean
  trashedAt: number | null
  originalNotebookId: string | null
  originalFolderId: string | null
  updatedAt: number
  createdAt: number
  synced: boolean
}

export interface LocalNotebook {
  id: string
  workspaceId: string
  name: string
  updatedAt: number
  synced: boolean
}

export interface LocalFolder {
  id: string
  notebookId: string
  parentFolderId: string | null
  name: string
  depth: number
  updatedAt: number
  synced: boolean
}

export interface LocalWorkspace {
  id: string
  userId: string
  name: string
  updatedAt: number
}

export interface OfflineQueueItem {
  id?: number
  type: string
  payload: string
  createdAt: number
}

export interface LocalVersionHistory {
  id?: number
  noteId: string
  title: string
  content: string
  savedAt: number
}

export interface LocalActivity {
  id?: number
  userId: string
  action: string
  targetType: string
  targetId: string
  targetName: string
  occurredAt: number
}

export interface LocalSettings {
  userId: string
  theme: 'light' | 'dark' | 'system'
  accentColor: string
  notificationsDeniedAt: number | null
  notificationsEnabled: boolean
  lastSyncAt: number | null
  syncStatus: 'synced' | 'syncing' | 'queued' | 'error'
}

class SyncNoteDB extends Dexie {
  notes!: Table<LocalNote, string>
  notebooks!: Table<LocalNotebook, string>
  folders!: Table<LocalFolder, string>
  workspaces!: Table<LocalWorkspace, string>
  offlineQueue!: Table<OfflineQueueItem, number>
  versionHistory!: Table<LocalVersionHistory, number>
  activity!: Table<LocalActivity, number>
  settings!: Table<LocalSettings, string>

  constructor(userId: string) {
    // Each user gets their own isolated database — no data leakage between accounts
    super(`avulex_db_${userId}`)
    this.version(1).stores({
      notes: 'id, notebookId, folderId, updatedAt, isTrashed, isArchived, isPinned, isFavorite',
      notebooks: 'id, workspaceId, updatedAt',
      folders: 'id, notebookId, parentFolderId',
      workspaces: 'id, userId',
      offlineQueue: '++id, type, createdAt',
      versionHistory: '++id, noteId, savedAt',
      activity: '++id, userId, occurredAt',
      settings: 'userId',
    })
  }
}

// Cache one DB instance per userId
const _instances: Record<string, SyncNoteDB> = {}

export function getDB(userId?: string): SyncNoteDB {
  if (typeof window === 'undefined') throw new Error('IndexedDB only in browser')

  // If no userId given, try to get it from localStorage (set on login)
  const uid = userId || localStorage.getItem('avulex_uid') || 'anonymous'

  if (!_instances[uid]) {
    _instances[uid] = new SyncNoteDB(uid)
  }
  return _instances[uid]
}

// Call this right after login to set the active user
export function setActiveUser(userId: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('avulex_uid', userId)
}

// Call this on logout to clear the active user
export function clearActiveUser() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('avulex_uid')
}
