import { UserDocument } from "@/types/document"
import UserView from "./UserView"

const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || 'http://localhost:4001'

interface Props {
  params: { id: string }
  searchParams: { templateId?: string; orderId?: string }
}

export default async function UserDetailPage({ params, searchParams }: Props) {
  const { id } = params
  const { templateId, orderId } = searchParams

  let userDocuments: UserDocument[] = []

  try {
    const res = await fetch(`${BACKEND_API}/api/user/documents/by-email/${encodeURIComponent(id)}`, { cache: 'no-store' })
    if (res.ok) userDocuments = await res.json()
  } catch {}

  if (templateId) {
    userDocuments = userDocuments.filter(d => d.templateId === templateId)
  }

  return <UserView email={decodeURIComponent(id)} documents={userDocuments} orderId={orderId} />
}

