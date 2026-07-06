'use client'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'

const ERROR_MESSAGES: Record<string, string> = {
  signin_failed: 'Sign-in failed. Please try again.',
  oauth_cancelled: '',  // silent – user cancelled
}

export function LoginClient({ error }: { error?: string }) {
  const [loading, setLoading] = useState(false)

  const handleSignIn = () => {
    setLoading(true)
    window.location.href = '/api/auth/google'
  }

  const errorMsg = error && ERROR_MESSAGES[error] !== undefined ? ERROR_MESSAGES[error] : error ? 'An error occurred.' : null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-6">
      {/* Full-screen gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-slate-900 to-blue-950" />
      {/* Soft glow blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">

        {/* Logo with glow */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-violet-500/30 blur-xl scale-110" />
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-2xl shadow-violet-500/40">
              <svg width="40" height="40" viewBox="0 0 32 32" fill="none" aria-hidden>
                <path d="M8 24L16 8L24 24" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10.5 19h11" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white tracking-tight">Avulex Notes</h1>
            <p className="text-sm text-white/50 mt-1">Notes that follow you everywhere</p>
          </div>
        </div>

        {/* Sign-in card */}
        <div className="w-full rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/15 shadow-2xl p-6 space-y-5">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-white">Welcome back</h2>
            <p className="text-sm text-white/50 mt-0.5">Sign in to access your notes</p>
          </div>

          {errorMsg && (
            <Alert variant="destructive" className="border-red-500/30 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">{errorMsg}</AlertDescription>
            </Alert>
          )}

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl bg-white text-slate-900 font-semibold text-base shadow-lg shadow-black/20 transition-all duration-150 active:scale-[0.97] hover:bg-white/90 disabled:opacity-60 touch-manipulation"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>

          <p className="text-xs text-center text-white/40">
            Your notes are end-to-end encrypted and synced automatically
          </p>
        </div>

        {/* Footer links */}
        <div className="text-center text-xs text-white/30 space-y-1">
          <p>By signing in, you agree to our</p>
          <div className="flex justify-center gap-4">
            <a href="/terms" className="text-white/50 hover:text-white transition-colors underline">Terms</a>
            <a href="/privacy" className="text-white/50 hover:text-white transition-colors underline">Privacy</a>
          </div>
        </div>
      </div>
    </div>
  )
}
