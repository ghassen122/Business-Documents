import { cookies } from 'next/headers'
import DocumentView from './DocumentView'
import type { DocumentTemplate, UserDocument } from '@/types/document'

const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || 'http://backend:4001'

export default async function DocumentsPage() {
  const cookieStore  = await cookies()
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')

  // Fetch templates (public â€” no auth needed)
  let initialTemplates: DocumentTemplate[] = []
  try {
    const res = await fetch(`${BACKEND_API}/api/templates`, { cache: 'no-store' })
    if (res.ok) initialTemplates = await res.json()
  } catch {}

  // Check auth + fetch saved docs
  let isLoggedIn = false
  let initialSavedDocs: Pick<UserDocument, '_id' | 'templateId'>[] = []
  try {
    const meRes = await fetch(`${BACKEND_API}/api/auth/me`, {
      headers: { Cookie: cookieHeader },
      cache: 'no-store',
    })
    if (meRes.ok) {
      isLoggedIn = true
      const docsRes = await fetch(`${BACKEND_API}/api/user/documents`, {
        headers: { Cookie: cookieHeader },
        cache: 'no-store',
      })
      if (docsRes.ok) {
        const docs: UserDocument[] = await docsRes.json()
        initialSavedDocs = docs.map(d => ({ _id: d._id, templateId: d.templateId }))
      }
    }
  } catch {}

  return (
    <DocumentView
      initialTemplates={initialTemplates}
      initialSavedDocs={initialSavedDocs}
      isLoggedIn={isLoggedIn}
    />
  )
}
