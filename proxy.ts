import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.SESSION_SECRET!)

const publicPaths = ['/login', '/api/auth', '/api/health']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public paths
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Check session cookie
  const token = request.cookies.get('session')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    await jwtVerify(token, secret, { algorithms: ['HS256'] })
    return NextResponse.next()
  } catch {
    // Invalid or expired token — clear cookie and redirect
    const res = NextResponse.redirect(new URL('/login', request.url))
    res.cookies.delete('session')
    return res
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|icons|sw\\.js|manifest\\.webmanifest).*)'],
}
