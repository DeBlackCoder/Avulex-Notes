import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Derive redirect URI from the actual request URL — works on any domain
  const redirectUri = new URL('/api/auth/callback', request.url).toString()

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )
}
