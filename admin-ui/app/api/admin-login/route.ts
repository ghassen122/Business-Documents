import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { password } = body
  const expected = process.env.ADMIN_PASSWORD

  if (!expected) {
    console.error('[admin-login] ADMIN_PASSWORD is not set in .env.local')
    return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500 })
  }

  if (!password || password !== expected) {
    return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set('admin_session', '1', {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 8,
    secure: process.env.NODE_ENV === 'production',
  })

  return NextResponse.json({ ok: true })
}
