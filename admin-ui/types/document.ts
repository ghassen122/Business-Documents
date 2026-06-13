export interface BlankDescriptor {
  id: number
  name: string
  marker: string
  contextBefore?: string
  contextAfter?: string
}

export interface DocumentTemplate {
  id: string
  name: string
  fileName?: string
  price?: number          // 0 = gratuit
  blanksCount: number
  blanks: BlankDescriptor[]
  createdAt: string
  layout?: Record<string, unknown>
  blocks?: unknown[]
  hyperlinks?: Record<string, string>
}

export interface UserDocument {
  _id: string
  templateId: string
  templateName: string
  savedAt: string
  values?: Record<string, string>
  labels?: Record<string, string>
}

export interface Order {
  _id: string
  userId: string | null
  guestEmail: string | null
  templateId: string
  templateName: string
  amount: number
  payment: boolean
  createdAt: string
}
