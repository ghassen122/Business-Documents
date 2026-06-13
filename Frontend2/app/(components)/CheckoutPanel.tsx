'use client'
import React, { useState, useEffect, useCallback } from 'react'
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import Link from 'next/link'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
const DOCX_API = process.env.NEXT_PUBLIC_DOCX_API || 'http://localhost:4001'

// ─── Card element shared style ─────────────────────────────────────────────
const CARD_STYLE = {
  style: {
    base: {
      fontSize: '14px',
      color: '#1a1a1a',
      fontFamily: 'inherit',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#e53e3e' },
  },
}

// ─── Inner form (uses Stripe hooks, must be inside <Elements>) ─────────────
interface FormProps {
  clientSecret: string
  orderId: string
  guestEmail: string
  templateName: string
  price: number
  onSuccess: (pdfBlob: Blob, filename: string) => void
  onClose: () => void
  onLoginClick: () => void
}

function CheckoutForm({
  clientSecret,
  orderId,
  guestEmail,
  templateName,
  price,
  onSuccess,
  onClose,
  onLoginClick,
}: FormProps) {
  const stripe   = useStripe()
  const elements = useElements()

  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [cgv,     setCgv]     = useState(false)
  const [method,  setMethod]  = useState<'card' | 'paypal'>('card')

  // Computed price breakdown (TTC → HT + TVA at 20%)
  const priceTTC = price
  const priceHT  = +(priceTTC / 1.2).toFixed(2)
  const priceTVA = +(priceTTC - priceHT).toFixed(2)

  const fmt = (v: number) =>
    v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    if (!cgv) { setError('Veuillez accepter les conditions générales de vente.'); return }

    const cardNumber = elements.getElement(CardNumberElement)
    if (!cardNumber) return

    setBusy(true)
    setError(null)

    try {
      // 1. Confirm the payment with Stripe
      const { error: stripeErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumber,
          billing_details: { email: guestEmail },
        },
      })

      if (stripeErr) {
        setError(stripeErr.message || 'Erreur de paiement.')
        setBusy(false)
        // Notify backend so a failure email is sent to the client (fire-and-forget)
        console.log('[payment-failed] orderId:', orderId, 'calling endpoint...')
        fetch(`${DOCX_API}/api/orders/${orderId}/payment-failed`, { method: 'POST' })
          .then(r => r.json().then(d => console.log('[payment-failed] response:', d)).catch(() => {}))
          .catch(e => console.error('[payment-failed] fetch error:', e))
        return
      }

      if (paymentIntent?.status !== 'succeeded') {
        setError('Paiement non abouti. Veuillez réessayer.')
        setBusy(false)
        fetch(`${DOCX_API}/api/orders/${orderId}/payment-failed`, { method: 'POST' }).catch(() => {})
        return
      }

      // 2. Confirm on backend → receive signed PDF
      const res = await fetch(`${DOCX_API}/api/orders/guest-confirm`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ paymentIntentId: paymentIntent.id, orderId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        // Payment succeeded — PDF will arrive by email
        onSuccess(new Blob(), templateName)
        return
      }

      const blob = await res.blob()
      const cd   = res.headers.get('Content-Disposition') || ''
      const match = cd.match(/filename="?([^"]+)"?/)
      const filename = match?.[1] || `${templateName}.pdf`
      onSuccess(blob, filename)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue.')
      // Stripe threw an exception — also notify backend
      if (orderId) {
        console.log('[payment-failed] exception, orderId:', orderId)
        fetch(`${DOCX_API}/api/orders/${orderId}/payment-failed`, { method: 'POST' })
          .then(r => r.json().then(d => console.log('[payment-failed] response:', d)).catch(() => {}))
          .catch(e => console.error('[payment-failed] fetch error:', e))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-0">

      {/* ── Price summary ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden mb-5">
        <div className="flex items-start justify-between p-4 border-b border-gray-100 bg-gray-50">
          <div>
            <p className="text-[13px] font-medium text-gray-800 leading-snug">{templateName}</p>
          </div>
          <span className="text-[13px] font-semibold text-gray-700 ml-4 whitespace-nowrap">{fmt(priceTTC)}</span>
        </div>
        <div className="p-4 flex flex-col gap-1.5">
          <div className="flex justify-between text-[13px] text-gray-600">
            <span>Total HT</span><span>{fmt(priceHT)}</span>
          </div>
          <div className="flex justify-between text-[13px] text-gray-600">
            <span>TVA - 20,00%</span><span>{fmt(priceTVA)}</span>
          </div>
          <div className="flex justify-between text-[14px] font-bold text-gray-900 mt-1 pt-2 border-t border-gray-100">
            <span>Total TTC</span><span>{fmt(priceTTC)}</span>
          </div>
        </div>
      </div>

      {/* ── Email display ── */}
      <div className="mb-4">
        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
          Adresse email (pour recevoir le document)
        </label>
        <div className="w-full py-[10px] px-3 border border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-50">
          {guestEmail}
        </div>
      </div>

      {/* ── Payment method ── */}
      <div className="mb-4">
        <label className="block text-[13px] font-semibold text-gray-700 mb-2">
          Moyen de paiement
        </label>
        <div className="flex flex-col gap-2">
          {/* Card */}
          <button
            type="button"
            onClick={() => setMethod('card')}
            className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-colors cursor-pointer ${
              method === 'card'
                ? 'border-[#1a5450] bg-[#f0faf9]'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${method === 'card' ? 'border-[#1a5450]' : 'border-gray-300'}`}>
                {method === 'card' && <div className="w-2 h-2 rounded-full bg-[#1a5450]" />}
              </div>
              <div className="flex items-center gap-1.5">
                {/* CB icon */}
                <svg width="28" height="18" viewBox="0 0 28 18" fill="none" className="rounded-sm overflow-visible">
                  <rect width="28" height="18" rx="3" fill="#1a56db"/>
                  <text x="5" y="13" fontSize="9" fontWeight="700" fill="white" fontFamily="Arial">CB</text>
                </svg>
                {/* Visa */}
                <svg width="36" height="12" viewBox="0 0 36 12"><text x="0" y="11" fontSize="13" fontWeight="700" fontFamily="Arial" fill="#1a1f71">VISA</text></svg>
                {/* Mastercard */}
                <svg width="22" height="14" viewBox="0 0 22 14">
                  <circle cx="8" cy="7" r="7" fill="#eb001b"/>
                  <circle cx="14" cy="7" r="7" fill="#f79e1b"/>
                  <path d="M11 2.5a7 7 0 0 1 0 9" fill="#ff5f00"/>
                </svg>
              </div>
            </div>
            <span className="text-[13px] text-gray-600">Carte bancaire</span>
          </button>

          {/* PayPal */}
          <button
            type="button"
            onClick={() => setMethod('paypal')}
            className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-colors cursor-pointer ${
              method === 'paypal'
                ? 'border-[#1a5450] bg-[#f0faf9]'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${method === 'paypal' ? 'border-[#1a5450]' : 'border-gray-300'}`}>
                {method === 'paypal' && <div className="w-2 h-2 rounded-full bg-[#1a5450]" />}
              </div>
              {/* PayPal logo text */}
              <span className="text-[15px] font-bold" style={{ color: '#253b80' }}>Pay</span>
              <span className="text-[15px] font-bold" style={{ color: '#169bd7' }}>Pal</span>
            </div>
            <span className="text-[13px] text-gray-600">Paypal</span>
          </button>
        </div>
      </div>

      {/* ── Card fields (shown only for card) ── */}
      {method === 'card' && (
        <div className="mb-4 flex flex-col gap-3">
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Numéro de carte</label>
            <div className="px-3 py-[11px] border border-gray-200 rounded-lg bg-white">
              <CardNumberElement options={CARD_STYLE} />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Date</label>
              <div className="px-3 py-[11px] border border-gray-200 rounded-lg bg-white">
                <CardExpiryElement options={CARD_STYLE} />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Code</label>
              <div className="px-3 py-[11px] border border-gray-200 rounded-lg bg-white">
                <CardCvcElement options={CARD_STYLE} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PayPal info (shown when paypal selected) ── */}
      {method === 'paypal' && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-[13px] text-blue-700">
          Le paiement PayPal n'est pas encore disponible. Veuillez utiliser la carte bancaire.
        </div>
      )}

      {/* ── CGV checkbox ── */}
      <div className="mb-5">
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={cgv}
            onChange={e => setCgv(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#1a5450] cursor-pointer"
          />
          <span className="text-[13px] text-gray-700">
            J'accepte les{' '}
            <Link href="/cgv" target="_blank" className="underline text-[#1a5450]">
              conditions générales de vente
            </Link>
          </span>
        </label>
      </div>

      {/* ── Error message ── */}
      {error && (
        <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">
          {error}
        </div>
      )}

      {/* ── Submit button ── */}
      <button
        type="submit"
        disabled={busy || !stripe || method === 'paypal'}
        className="w-full py-3.5 rounded-full font-bold text-[15px] text-white border-none cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: busy ? '#5da89e' : 'linear-gradient(90deg, #00c6a2 0%, #00b899 100%)' }}
      >
        {busy ? '⏳ Traitement en cours…' : 'Valider et télécharger le document'}
      </button>

      {/* ── Login link ── */}
      <p className="text-center text-[12px] text-gray-500 mt-3">
        Vous avez un abonnement ?{' '}
        <button
          type="button"
          onClick={onLoginClick}
          className="underline text-gray-600 hover:text-[#1a5450] transition-colors bg-transparent border-none cursor-pointer p-0 text-[12px]"
        >
          Identifiez-vous
        </button>
      </p>
    </form>
  )
}

// ─── Outer panel: fetches client_secret then mounts Elements ───────────────
export interface CheckoutPanelProps {
  templateId: string
  templateName: string
  price: number
  values: Record<string, string>
  guestEmail: string
  onClose: () => void
  onLoginClick: () => void
}

export default function CheckoutPanel({
  templateId,
  templateName,
  price,
  values,
  guestEmail,
  onClose,
  onLoginClick,
}: CheckoutPanelProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [orderId,      setOrderId]      = useState<string | null>(null)
  const [initError,    setInitError]    = useState<string | null>(null)
  const [success,      setSuccess]      = useState(false)

  // Create PaymentIntent on mount
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const res = await fetch(`${DOCX_API}/api/orders/guest-payment-intent`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ templateId, templateName, values, price, guestEmail }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erreur de création du paiement')
        if (!cancelled) {
          setClientSecret(data.clientSecret)
          setOrderId(data.orderId)
        }
      } catch (err: unknown) {
        if (!cancelled) setInitError(err instanceof Error ? err.message : 'Erreur inattendue')
      }
    }
    init()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSuccess = useCallback((blob: Blob, filename: string) => {
    setSuccess(true)
    // Auto-download if we got a real blob
    if (blob.size > 0) {
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    }
  }, [])

  return (
    /* ── Backdrop overlay ── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-[16px] font-bold text-gray-900">Paiement sécurisé</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-400 hover:text-gray-600 text-xl border-none cursor-pointer bg-transparent"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5">
          {/* ── Success state ── */}
          {success ? (
            <div className="flex flex-col items-center justify-center py-6 gap-4 text-center">
              <div className="text-5xl">✅</div>
              <h3 className="text-[17px] font-bold text-gray-900">Paiement réussi !</h3>
              <p className="text-[13px] text-gray-600 leading-relaxed">
                Votre document PDF a été téléchargé automatiquement.<br />
                Une copie a été envoyée à <strong>{guestEmail}</strong>.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-full bg-[#1a5450] text-white font-semibold text-[14px] border-none cursor-pointer hover:bg-[#226d68] transition"
              >
                Fermer
              </button>
            </div>
          ) : initError ? (
            /* ── Init error ── */
            <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
              <div className="text-4xl">⚠️</div>
              <p className="text-[13px] text-red-600">{initError}</p>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-full bg-gray-200 text-gray-700 font-semibold text-[14px] border-none cursor-pointer"
              >
                Fermer
              </button>
            </div>
          ) : !clientSecret ? (
            /* ── Loading ── */
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 border-2 border-[#1a5450] border-t-transparent rounded-full animate-spin" />
              <p className="text-[13px] text-gray-500">Initialisation du paiement…</p>
            </div>
          ) : (
            /* ── Stripe Elements form ── */
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm
                clientSecret={clientSecret}
                orderId={orderId!}
                guestEmail={guestEmail}
                templateName={templateName}
                price={price}
                onSuccess={handleSuccess}
                onClose={onClose}
                onLoginClick={onLoginClick}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  )
}
