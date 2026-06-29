import OrderView from './orderView'
import type { Order } from '@/types/document'

const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || 'http://Backend:4001'

export default async function OrdersPage() {
  let orders: Order[] = []

  try {
    const res = await fetch(`${BACKEND_API}/api/orders/list`, { cache: 'no-store' })
    if (res.ok) {
      const json = await res.json()
      orders = Array.isArray(json.orders) ? json.orders : []
    }
  } catch {}

  return <OrderView orders={orders} />
}
