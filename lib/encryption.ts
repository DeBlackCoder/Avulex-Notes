'use client'

export interface EncryptedPayload {
  ciphertext: string  // base64
  iv: string          // base64
}

function toBase64(buf: ArrayBuffer | ArrayBufferLike): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)))
}

function fromBase64(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer as ArrayBuffer
}

export async function deriveKey(googleSub: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(googleSub), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptText(key: CryptoKey, plaintext: string): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  )
  return { ciphertext: toBase64(ciphertext), iv: toBase64(iv.buffer as ArrayBuffer) }
}

export async function decryptText(key: CryptoKey, payload: EncryptedPayload): Promise<string> {
  const iv = fromBase64(payload.iv)
  const ct = fromBase64(payload.ciphertext)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(plain)
}

// Salt stored in localStorage per user
export function getOrCreateSalt(userId: string): ArrayBuffer {
  const key = `avulex_salt_${userId}`
  const stored = localStorage.getItem(key)
  if (stored) return fromBase64(stored)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  localStorage.setItem(key, toBase64(salt.buffer as ArrayBuffer))
  return salt.buffer as ArrayBuffer
}
