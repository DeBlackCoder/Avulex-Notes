'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { setActiveUser, clearActiveUser } from '@/lib/db'

interface User {
  userId: string
  email: string
  displayName: string
  avatarUrl: string
  googleSub: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          const u: User | null = data.user ?? null
          setUser(u)
          // Point IndexedDB to this user's isolated database
          if (u?.userId) setActiveUser(u.userId)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const signOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    clearActiveUser()  // Clear the userId from localStorage so next user starts fresh
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
