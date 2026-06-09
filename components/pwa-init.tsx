'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export function PWAInit() {
  const router = useRouter()

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(reg => {
        // Check for updates on each load
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              toast('Update available', {
                description: 'A new version of Avulex Notes is ready.',
                duration: Infinity,
                action: {
                  label: 'Update now',
                  onClick: () => {
                    reg.waiting?.postMessage({ type: 'SKIP_WAITING' })
                    window.location.reload()
                  },
                },
              })
            }
          })
        })

        // Listen for FLUSH_QUEUE from SW background sync
        navigator.serviceWorker.addEventListener('message', (e) => {
          if (e.data?.type === 'FLUSH_QUEUE') {
            window.dispatchEvent(new Event('avulex:flush'))
          }
        })
      })
      .catch(err => console.warn('[SW] Registration failed:', err))
  }, [])

  return null
}
