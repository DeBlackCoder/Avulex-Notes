import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { User, Workspace, Notebook } from '@/lib/models'
import { createSession } from '@/lib/session'
import { generateId } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=oauth_cancelled', request.url))
  }

  try {
    // Exchange code for tokens — use the actual request URL as redirect_uri
    // so it works on localhost AND production without needing env changes
    const redirectUri = new URL('/api/auth/callback', request.url).toString()

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text()
      console.error('Token exchange failed:', tokenRes.status, errBody)
      throw new Error('Token exchange failed')
    }
    const tokens = await tokenRes.json()

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (!userRes.ok) throw new Error('Failed to fetch user info')
    const googleUser = await userRes.json()

    await connectDB()

    // Upsert user
    let user = await User.findOne({ googleSub: googleUser.sub })
    if (!user) {
      // Create default workspace + notebook
      const workspaceId = generateId()
      const notebookId = generateId()
      const userId = generateId()

      user = await User.create({
        _id: userId,
        googleSub: googleUser.sub,
        email: googleUser.email,
        displayName: googleUser.name,
        avatarUrl: googleUser.picture,
        defaultNotebookId: notebookId,
      })

      await Workspace.create({
        _id: workspaceId,
        userId,
        name: 'My Workspace',
      })

      await Notebook.create({
        _id: notebookId,
        workspaceId,
        ownerUserId: userId,
        name: 'Personal',
        collaborators: [],
      })
    } else {
      await User.findByIdAndUpdate(user._id, {
        displayName: googleUser.name,
        avatarUrl: googleUser.picture,
      })
    }

    await createSession({
      userId: user._id.toString(),
      googleSub: googleUser.sub,
      email: googleUser.email,
      displayName: googleUser.name,
      avatarUrl: googleUser.picture,
    })

    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(new URL('/login?error=signin_failed', request.url))
  }
}
