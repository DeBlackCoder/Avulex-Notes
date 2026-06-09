import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'

export async function GET() {
  try {
    await connectDB()
    return NextResponse.json({ db: 'connected', status: 'ok' })
  } catch (err) {
    return NextResponse.json({ db: 'failed', error: String(err) }, { status: 500 })
  }
}
