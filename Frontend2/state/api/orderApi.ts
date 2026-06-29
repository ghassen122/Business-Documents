import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { Order } from '@/types/document'

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API || 'http://backend:4001'

export interface CreateOrderArg {
  templateId:   string
  templateName: string
  values:        Record<string, string>
  price:         number
}

export interface CreateOrderResult {
  sessionUrl: string
  orderId:    string
}

export interface VerifyOrderArg {
  orderId:   string
  sessionId: string
}

export const orderApi = createApi({
  reducerPath: 'orderApi',

  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE}/api`,
    credentials: 'include',
  }),

  tagTypes: ['Orders'],

  endpoints: (builder) => ({

    // POST /api/orders/create — creates order + Stripe session
    createOrder: builder.mutation<CreateOrderResult, CreateOrderArg>({
      query: (body) => ({
        url:    '/orders/create',
        method: 'POST',
        body,
      }),
    }),

    // POST /api/orders/verify — verifies Stripe payment
    verifyOrder: builder.mutation<{ success: boolean; order?: Order }, VerifyOrderArg>({
      query: (body) => ({
        url:    '/orders/verify',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Orders'],
    }),

    // GET /api/orders/my — user's paid orders
    getMyOrders: builder.query<Order[], void>({
      query:        () => '/orders/my',
      providesTags: ['Orders'],
    }),
  }),
})

export const {
  useCreateOrderMutation,
  useVerifyOrderMutation,
  useGetMyOrdersQuery,
} = orderApi
