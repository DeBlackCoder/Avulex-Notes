'use client'
import { useState } from 'react'
import { Loader2, Sparkles, Zap, Shield, BookOpen, Brain, Wifi, Lock } from 'lucide-react'

const ERROR_MESSAGES: Record<string, string> = {
  signin_failed: 'Sign-in failed. Please try again.',
  oauth_cancelled: '',
}

const FEATURES = [
  { icon: Brain,    label: 'AI Assistant',    desc: 'Ava writes, edits & summarizes' },
  { icon: Wifi,     label: 'Works Offline',   desc: 'Syncs when you reconnect' },
  { icon: Lock,     label: 'Encrypted',       desc: 'Private by default' },
  { icon: BookOpen, label: 'Organized',       desc: 'Notebooks, pins & favorites' },
]

export function LoginClient({ error }: { error?: string }) {
  const [loading, setLoading] = useState(false)

  const handleSignIn = () => {
    setLoading(true)
    window.location.href = '/api/auth/google'
  }

  const errorMsg =
    error && ERROR_MESSAGES[error] !== undefined
      ? ERROR_MESSAGES[error]
      : error ? 'An error occurred.' : null

  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden bg-[#080810]">

      {/* ── Background ── */}
      {/* Mesh gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,40,200,0.3),transparent)]" />
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      {/* Ambient orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-violet-600/15 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-80 h-80 rounded-full bg-purple-800/10 blur-[100px] pointer-events-none" />

      {/* ── Header bar ── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none" aria-hidden>
              <path d="M8 24L16 8L24 24" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10.5 19h11" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-bold text-white text-sm tracking-tight">Avulex Notes</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-white/40 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Free forever
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 py-8 text-center max-w-2xl mx-auto w-full">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-semibold mb-8 backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5" />
          AI-powered note-taking
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.1] mb-5">
          Notes that{' '}
          <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
            think with you
          </span>
        </h1>

        <p className="text-white/50 text-base sm:text-lg max-w-md leading-relaxed mb-10">
          Avulex Notes combines a fast offline-first editor with Ava, your AI that writes, rewrites, translates and answers questions from your notes.
        </p>

        {/* CTA card */}
        <div className="w-full max-w-sm mx-auto space-y-4">

          {/* Error */}
          {errorMsg && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Google sign-in */}
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl bg-white text-gray-900 font-bold text-[15px] shadow-2xl shadow-black/40 hover:bg-gray-50 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 touch-manipulation"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>

          <p className="text-xs text-white/30 text-center leading-relaxed">
            No password needed · End-to-end encrypted · Free
          </p>
        </div>

        {/* Feature pills — horizontal row */}
        <div className="flex flex-wrap justify-center gap-2 mt-12">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/8 backdrop-blur-sm">
              <Icon className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span className="text-[12px] font-medium text-white/60">{label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* ── Feature grid ── */}
      <section className="relative z-10 w-full max-w-4xl mx-auto px-5 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label}
              className="flex flex-col gap-2.5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06] transition-colors">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/10 border border-white/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/80">{label}</p>
                <p className="text-[12px] text-white/35 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 text-center pb-8 px-5">
        <div className="flex items-center justify-center gap-5 text-xs text-white/25">
          <a href="/terms" className="hover:text-white/50 transition-colors">Terms</a>
          <span>·</span>
          <a href="/privacy" className="hover:text-white/50 transition-colors">Privacy</a>
          <span>·</span>
          <span>© 2025 Avulex</span>
        </div>
      </footer>

    </div>
  )
}
