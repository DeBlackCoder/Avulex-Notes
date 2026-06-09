'use client'
import { useEffect } from 'react'
import { toast } from 'sonner'

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr.buffer as ArrayBuffer
}

async function subscribeToPush(reg: ServiceWorkerRegistration) {
  try {
    const existing = await reg.pushManager.getSubscription()
    if (existing) return // already subscribed

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    })

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    })
  } catch { /* silent — user may have blocked */ }
}

export function PWAInit() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(reg => {
        // Update detection
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

        // Background sync flush
        navigator.serviceWorker.addEventListener('message', (e) => {
          if (e.data?.type === 'FLUSH_QUEUE') {
            window.dispatchEvent(new Event('avulex:flush'))
          }
        })

        // Request push permission after first note save
        const onFirstSave = () => {
          subscribeToPush(reg)
          window.removeEventListener('avulex:first-save', onFirstSave)
        }
        window.addEventListener('avulex:first-save', onFirstSave)
      })
      .catch(err => console.warn('[SW]', err))
  }, [])

  return null
}
