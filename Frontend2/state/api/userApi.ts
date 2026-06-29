import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { UserDocument } from '@/types/document'

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API || 'http://13.61.104.59:4001'

export const userApi = createApi({
  reducerPath: 'userApi',

  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE}/api`,
    credentials: 'include',
  }),

  tagTypes: ['UserDocuments'],

  endpoints: (builder) => ({

    // GET MY SAVED DOCUMENTS
    getMyDocuments: builder.query<UserDocument[], void>({
      query: () => '/user/documents',
      providesTags: ['UserDocuments'],
    }),

    // SAVE A FILLED DOCUMENT
    saveDocument: builder.mutation<UserDocument[], Pick<UserDocument, 'templateId' | 'templateName' | 'values'>>({
      query: (body) => ({
        url: '/user/documents',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['UserDocuments'],
    }),

    // DELETE A SAVED DOCUMENT
    removeDocument: builder.mutation<UserDocument[], string>({
      query: (templateId) => ({
        url: '/user/documents',
        method: 'DELETE',
        body: { templateId },
      }),
      invalidatesTags: ['UserDocuments'],
    }),
  }),
})

export const {
  useGetMyDocumentsQuery,
  useSaveDocumentMutation,
  useRemoveDocumentMutation,
} = userApi
