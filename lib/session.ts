import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secret = new TextEncoder().encode(process.env.SESSION_SECRET!)

export interface SessionPayload {
  userId: string
  googleSub: string
  email: string
  displayName: string
  avatarUrl: string
  iat?: number
  exp?: number
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function createSession(payload: SessionPayload) {
  const token = await encrypt(payload)
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const store = await cookies()
  store.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires,
    sameSite: 'lax',
    path: '/',
  })
}

export async function deleteSession() {
  const store = await cookies()
  store.delete('session')
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get('session')?.value
  return decrypt(token)
}
