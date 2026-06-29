import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API || 'http://backend:4001'

export interface AuthUser {
  id: string
  name: string
  email: string
}

export const authApi = createApi({
  reducerPath: 'authApi',

  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE}/api/auth`,
    credentials: 'include',
  }),

  endpoints: (builder) => ({

    getMe: builder.query<AuthUser, void>({
      query: () => '/me',
    }),

    login: builder.mutation<AuthUser, { email: string; password: string }>({
      query: (body) => ({
        url: '/login',
        method: 'POST',
        body,
      }),
    }),

    register: builder.mutation<AuthUser, { name: string; email: string; password: string }>({
      query: (body) => ({
        url: '/register',
        method: 'POST',
        body,
      }),
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/logout',
        method: 'POST',
      }),
    }),
  }),
})

export const {
  useGetMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
} = authApi
