import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { Order } from '@/types/document'
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API || 'http://backend:4001'
export const orderApi = createApi({
  reducerPath: 'orderApi',

  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE}/api`,
    credentials: 'include',
  }),
   tagTypes: ['Orders'],

  endpoints: (builder) => ({
    //Get List of orders
    ListOrders: builder.query<Order[], void>({
      query:        () => '/orders/list',
      providesTags: ['Orders'],
    }),
})

export const {
  useGetListOrdersQuery
} = orderApi