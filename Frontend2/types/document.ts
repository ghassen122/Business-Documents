export interface BlankDescriptor {
  id: number
  name: string
  question?: string
  marker: string
  contextBefore?: string
  contextAfter?: string
}

export interface CivDescriptor {
  id: number
  match: string
  contextBefore?: string
  contextAfter?: string
  intervenantIndex: number
}

export interface TemplateDetails {
  intro?: string
  revisionLabel?: string
  formatsLabel?: string
  pageLabel?: string
  description?: string
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
  details?: TemplateDetails
  civs?: CivDescriptor[]
  intervenantNames?: string[]
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
  templateId: string
  templateName: string
  amount: number
  createdAt: string
}
