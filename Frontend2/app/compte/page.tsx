import { cookies } from 'next/headers'
import CompteView from './CompteView'
import type { AuthUser } from '@/state/api/authApi'
import type { UserDocument } from '@/types/document'

const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || 'http://13.61.104.59:4001'

export default async function ComptePage() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')

  let user: AuthUser | null = null
  let myDocs: UserDocument[] = []

  try {
    const meRes = await fetch(`${BACKEND_API}/api/auth/me`, {
      headers: { Cookie: cookieHeader },
      cache: 'no-store',
    })
    if (meRes.ok) {
      user = await meRes.json()
      const docsRes = await fetch(`${BACKEND_API}/api/user/documents`, {
        headers: { Cookie: cookieHeader },
        cache: 'no-store',
      })
      if (docsRes.ok) myDocs = await docsRes.json()
    }
  } catch {}

  return <CompteView initialUser={user} initialDocs={myDocs} />
}

