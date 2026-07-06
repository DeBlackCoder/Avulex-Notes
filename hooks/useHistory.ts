'use client'
import { useCallback } from 'react'

type HistoryAction =
  | 'note_viewed' | 'note_created' | 'note_edited' | 'note_deleted'
  | 'search_performed' | 'note_exported' | 'note_imported'
  | 'ai_summarized' | 'ai_titled' | 'ai_chat_started'
  | 'notebook_created' | 'notebook_deleted'

interface RecordOptions {
  targetId?: string
  targetTitle?: string
  targetType?: 'note' | 'notebook' | 'search' | 'ai'
  meta?: Record<string, unknown>
}

export function useHistory() {
  const record = useCallback(async (action: HistoryAction, opts?: RecordOptions) => {
    // Fire-and-forget — don't block the UI
    fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        targetId: opts?.targetId,
        targetTitle: opts?.targetTitle,
        targetType: opts?.targetType || 'note',
        meta: opts?.meta || {},
      }),
    }).catch(() => {})
  }, [])

  return { record }
}
