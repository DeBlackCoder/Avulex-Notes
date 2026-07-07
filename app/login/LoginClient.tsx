'use client'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, Sparkles, WifiOff, Lock, FolderOpen } from 'lucide-react'

const ERROR_MESSAGES: Record<string, string> = {
  signin_failed: 'Sign-in failed. Please try again.',
  oauth_cancelled: '', // silent – user cancelled
}

const FEATURE_TABS = [
  { icon: Sparkles, label: 'AI-assisted', rotate: '-rotate-2' },
  { icon: WifiOff, label: 'Works offline', rotate: 'rotate-1' },
  { icon: Lock, label: 'Encrypted', rotate: '-rotate-1' },
  { icon: FolderOpen, label: 'Always findable', rotate: 'rotate-2' },
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
      : error
      ? 'An error occurred.'
      : null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#15161d] px-5 py-10">
      <style>{`
        @keyframes draw-stroke {
          from { stroke-dashoffset: 120; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes settle-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes stamp-in {
          from { opacity: 0; transform: scale(0.9) rotate(-8deg); }
          to { opacity: 1; transform: scale(1) rotate(-3deg); }
        }
        .draw-path {
          stroke-dasharray: 120;
          stroke-dashoffset: 120;
          animation: draw-stroke 900ms 200ms ease-out forwards;
        }
        .settle-1 { opacity: 0; animation: settle-up 500ms 500ms ease-out forwards; }
        .settle-2 { opacity: 0; animation: settle-up 500ms 620ms ease-out forwards; }
        .settle-3 { opacity: 0; animation: settle-up 500ms 740ms ease-out forwards; }
        .stamp-mark { opacity: 0; animation: stamp-in 500ms 100ms cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @media (prefers-reduced-motion: reduce) {
          .draw-path, .settle-1, .settle-2, .settle-3, .stamp-mark {
            animation: none !important;
            opacity: 1 !important;
            stroke-dashoffset: 0 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* faint page texture */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
        {/* Ink stamp wordmark */}
        <div className="stamp-mark flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-[#f4ecd8] border-2 border-[#f4ecd8]/90 flex items-center justify-center -rotate-3 shadow-[0_6px_0_rgba(0,0,0,0.25)]">
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none" aria-label="Avulex Notes">
              <path
                className="draw-path"
                d="M11 37 L24 10 L37 37 M16 27 H32"
                stroke="#20222b"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-[30px] font-serif font-semibold text-[#f4ecd8] tracking-tight">
              Avulex Notes
            </h1>
            <p className="text-[13px] font-mono uppercase tracking-[0.16em] text-[#f4ecd8]/40 mt-1">
              write it down · find it later
            </p>
          </div>
        </div>

        {/* Ruled-paper sign-in card */}
        <div className="settle-1 w-full relative rounded-sm bg-[#f7f1e1] shadow-[0_20px_50px_rgba(0,0,0,0.45)] overflow-hidden">
          {/* ring-binder holes */}
          <div className="absolute left-[18px] top-0 bottom-0 flex flex-col justify-evenly py-8 z-10">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-3 h-3 rounded-full bg-[#15161d] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
              />
            ))}
          </div>
          {/* red margin rule */}
          <div className="absolute left-[46px] top-0 bottom-0 w-px bg-[#c1573f]/60" />
          {/* ruled lines */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, transparent, transparent 31px, #ded0ab 32px)',
            }}
          />

          <div className="relative pl-[64px] pr-6 py-7 space-y-5">
            <div>
              <h2 className="text-[19px] font-serif font-semibold text-[#20222b]">
                Welcome back
              </h2>
              <p className="text-[13px] text-[#5a5346] mt-0.5">
                Sign in to pick up where you left off
              </p>
            </div>

            {errorMsg && (
              <Alert
                variant="destructive"
                className="border-0 border-l-4 border-[#c1573f] rounded-none bg-[#f0dfd4] py-2.5"
              >
                <AlertCircle className="h-4 w-4 text-[#c1573f]" />
                <AlertDescription className="text-[#8a3d29] text-sm">
                  {errorMsg}
                </AlertDescription>
              </Alert>
            )}

            <button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full h-13 py-3.5 flex items-center justify-center gap-3 rounded-sm bg-[#20222b] text-[#f4ecd8] font-medium text-[15px] shadow-[0_3px_0_rgba(0,0,0,0.3)] transition-all duration-150 active:translate-y-[2px] active:shadow-none hover:bg-[#2b2d38] disabled:opacity-60 touch-manipulation"
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

            <p className="text-[11px] text-center text-[#5a5346]/70">
              Notes are encrypted and synced automatically
            </p>
          </div>
        </div>

        {/* feature tabs — sticky-note style */}
        <div className="settle-2 w-full flex flex-wrap justify-center gap-2.5">
          {FEATURE_TABS.map(({ icon: Icon, label, rotate }) => (
            <div
              key={label}
              className={`${rotate} flex items-center gap-1.5 rounded-sm bg-[#f4ecd8]/[0.07] border border-[#f4ecd8]/10 px-3 py-2`}
            >
              <Icon className="w-3.5 h-3.5 text-[#e7a93f] shrink-0" />
              <span className="text-[11px] font-medium text-[#f4ecd8]/70 whitespace-nowrap">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="settle-3 text-center text-[11px] text-[#f4ecd8]/30 space-y-1">
          <p>By signing in, you agree to our</p>
          <div className="flex justify-center gap-4 font-mono">
            <a href="/terms" className="text-[#f4ecd8]/50 hover:text-[#f4ecd8] transition-colors underline decoration-dashed underline-offset-4">
              terms
            </a>
            <a href="/privacy" className="text-[#f4ecd8]/50 hover:text-[#f4ecd8] transition-colors underline decoration-dashed underline-offset-4">
              privacy
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}