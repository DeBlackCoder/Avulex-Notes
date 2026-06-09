'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDB } from '@/lib/db'
import type { LocalNotebook } from '@/lib/db'
import { generateId } from '@/lib/utils'

export function useNotebooks() {
  return useQuery({
    queryKey: ['notebooks'],
    queryFn: async () => {
      if (typeof window === 'undefined') return []
      const db = getDB()
      return db.notebooks.toArray()
    },
    staleTime: 2000,
  })
}

export function useCreateNotebook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, workspaceId }: { name: string; workspaceId: string }) => {
      if (!name || name.length < 1 || name.length > 255) throw new Error('Name must be 1-255 characters')
      const db = getDB()
      const nb: LocalNotebook = {
        id: generateId(),
        workspaceId,
        name,
        updatedAt: Date.now(),
        synced: false,
      }
      await db.notebooks.add(nb)
      return nb
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notebooks'] }),
  })
}

export function useUpdateNotebook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const db = getDB()
      await db.notebooks.update(id, { name, updatedAt: Date.now(), synced: false })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notebooks'] }),
  })
}

export function useDeleteNotebook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const db = getDB()
      await db.notebooks.delete(id)
      await db.notes.where('notebookId').equals(id).modify({ isTrashed: true, trashedAt: Date.now() })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notebooks'] })
      qc.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}
