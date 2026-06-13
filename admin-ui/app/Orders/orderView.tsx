'use Client'
import type { Order } from '@/types/document'
import Link from 'next/link'

interface Props {
  orders: Order[]
}

const COLS = 'grid-cols-[90px_minmax(160px,2fr)_minmax(140px,1.8fr)_80px_120px_100px]'

export default function OrderView({ orders }: Props) {
  return (
    <div className="min-h-screen bg-[#f8f7f3]">

      {/* Header */}
      <header className="flex h-[60px] items-center justify-between bg-[#226d68] px-7 shadow-[0_2px_8px_rgba(0,0,0,.18)]">
        <div className="flex items-center gap-3">
          <span className="text-[22px]">📦</span>
          <span className="text-[18px] font-extrabold tracking-[0.3px] text-white">Commandes</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-white/85">
            {orders.length} commande{orders.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      <div className="px-7 py-8 mt-5 w-full max-w-[900px] mx-auto">
        {orders.length === 0 ? (
          <div className="text-center pt-12 text-[#888]">
            <p className="text-[40px] mb-3">📭</p>
            <p>Aucune commande pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px] overflow-hidden rounded-xl bg-white shadow-sm">

              {/* Header row */}
              <div className={`grid ${COLS} bg-[#226d68] text-white`}>
                {['ID commande', 'Template', 'Utilisateur', 'Montant', 'Statut', 'Date'].map(h => (
                  <div key={h} className="min-w-0 px-4 py-3 text-[13px] font-semibold">{h}</div>
                ))}
              </div>

              {/* Data rows */}
              {orders.map((order, i) => (
                <div
                  key={order._id}
                  className={`grid ${COLS} items-center border-b border-[#f0f0f0] last:border-0 ${
                    i % 2 === 0 ? 'bg-white' : 'bg-[#f8f7f3]'
                  }`}
                >
                  {/* ID */}
                  <div className="min-w-0 px-4 py-3">
                    <span className="block truncate font-mono text-[11px] text-[#888]">
                      {order._id.slice(-8)}
                    </span>
                  </div>

                  {/* Template */}
                  <div className="min-w-0 px-4 py-3 text-sm truncate">
                    {order.templateName || order.templateId}
                  </div>

                  {/* Utilisateur */}
                  <div className="min-w-0 px-4 py-3">
                    <p className="text-sm text-[#555] truncate m-0">
                      {order.guestEmail || order.userId || '—'}
                    </p>
                    {order.guestEmail && (
                      <Link
                        href={`/UserDetail/${encodeURIComponent(order.guestEmail)}?templateId=${encodeURIComponent(order.templateId)}&orderId=${encodeURIComponent(order._id)}`}
                        className="text-[11px] text-[#226d68] font-semibold hover:underline"
                      >
                        Applicant Details →
                      </Link>
                    )}
                  </div>

                  {/* Montant */}
                  <div className="min-w-0 px-4 py-3 text-sm font-semibold text-[#226d68]">
                    {order.amount} €
                  </div>

                  {/* Statut */}
                  <div className="min-w-0 px-4 py-3">
                    <span className={`inline-flex whitespace-nowrap px-3 py-0.5 rounded-full text-[12px] font-semibold ${
                      order.payment
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {order.payment ? '✅ Payé' : '⏳ En attente'}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="min-w-0 px-4 py-3 text-[13px] text-[#888] whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              ))}

            </div>
          </div>
        )}
      </div>
    </div>
  )
}
