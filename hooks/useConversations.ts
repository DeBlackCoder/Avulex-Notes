'use client'
import { useState, useCallback } from 'react'
import { generateId } from '@/lib/utils'

export interface ConvMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface Conversation {
  _id: string
  title: string
  messages: ConvMessage[]
  noteContext?: string | null
  noteId?: string | null
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/conversations')
      const data = await res.json()
      setConversations(data.conversations || [])
    } finally {
      setLoading(false)
    }
  }, [])

  const createConversation = useCallback(async (opts?: {
    title?: string
    noteContext?: string
    noteId?: string
  }) => {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: opts?.title || 'New conversation',
        noteContext: opts?.noteContext || null,
        noteId: opts?.noteId || null,
        messages: [],
      }),
    })
    const data = await res.json()
    const conv: Conversation = data.conversation
    setConversations(p => [conv, ...p])
    setActiveId(conv._id)
    return conv
  }, [])

  const appendMessages = useCallback(async (
    convId: string,
    messages: ConvMessage[],
    title?: string
  ) => {
    await fetch(`/api/conversations/${convId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, title }),
    })
    setConversations(p => p.map(c =>
      c._id === convId
        ? { ...c, messages: [...c.messages, ...messages], title: title || c.title }
        : c
    ))
  }, [])

  const deleteConversation = useCallback(async (convId: string) => {
    await fetch(`/api/conversations/${convId}`, { method: 'DELETE' })
    setConversations(p => p.filter(c => c._id !== convId))
    if (activeId === convId) setActiveId(null)
  }, [activeId])

  const pinConversation = useCallback(async (convId: string, pinned: boolean) => {
    await fetch(`/api/conversations/${convId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    })
    setConversations(p => p.map(c => c._id === convId ? { ...c, pinned } : c))
  }, [])

  return {
    conversations,
    loading,
    activeId,
    setActiveId,
    loadAll,
    createConversation,
    appendMessages,
    deleteConversation,
    pinConversation,
  }
}
