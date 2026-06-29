import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { DocumentTemplate } from '@/types/document'

const API_BASE = process.env.NEXT_PUBLIC_DOCX_API || 'http://13.61.104.59:4001'

export const templateApi = createApi({
  reducerPath: 'templateApi',

  baseQuery: fetchBaseQuery({ baseUrl: `${API_BASE}/api` }),

  tagTypes: ['Templates'],

  endpoints: (builder) => ({

    // GET ALL TEMPLATES
    getTemplates: builder.query<DocumentTemplate[], void>({
      query: () => '/templates',
      providesTags: ['Templates'],
    }),

    // GET ONE TEMPLATE  (full data with blocks/blanks)
    getTemplate: builder.query<DocumentTemplate, string>({
      query: (id) => `/templates/${id}`,
    }),

    // DELETE TEMPLATE
    deleteTemplate: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Templates'],
    }),
  }),
})

export const {
  useGetTemplatesQuery,
  useGetTemplateQuery,
  useDeleteTemplateMutation,
} = templateApi
