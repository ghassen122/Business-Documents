'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import Navbar from '../(components)/Navbar'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
const DOCX_API      = process.env.NEXT_PUBLIC_DOCX_API || 'http://backend:4001'

// ─── Stored draft shape (saved in sessionStorage by FillView) ──────────────
interface CheckoutDraft {
  templateId:   string
  templateName: string
  price:        number
  values:       Record<string, string>
  civValues?:   Record<string, string>
  labels?:      Record<string, string>
  fileName?:    string
}

// ─── Stripe card element shared style ──────────────────────────────────────
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

// ─── Price format helper ────────────────────────────────────────────────────
const fmt = (v: number) =>
  v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

// ─── Inner form (must live inside <Elements>) ────────────────────────────────
interface FormProps {
  draft:        CheckoutDraft
  email:        string
  clientSecret: string
  orderId:      string
  onSuccess:    (blob: Blob, filename: string) => void
}

function PaymentForm({ draft, email, clientSecret, orderId, onSuccess }: FormProps) {
  const stripe   = useStripe()
  const elements = useElements()

  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [cgv,    setCgv]    = useState(false)
  const [method, setMethod] = useState<'card' | 'paypal'>('card')

  const priceTTC = draft.price
  const priceHT  = +(priceTTC / 1.2).toFixed(2)
  const priceTVA = +(priceTTC - priceHT).toFixed(2)

  async function notifyPaymentFailed() {
    if (!orderId) return
    console.log('[payment-failed] orderId:', orderId, 'calling endpoint...')
    try {
      const res = await fetch(`${DOCX_API}/api/orders/${orderId}/payment-failed`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      console.log('[payment-failed] response:', data)
    } catch (err) {
      console.error('[payment-failed] fetch error:', err)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    if (!cgv) { setError('Veuillez accepter les conditions générales de vente.'); return }

    const cardNumber = elements.getElement(CardNumberElement)
    if (!cardNumber) return

    setBusy(true)
    setError(null)

    try {
      // 1. Confirm with Stripe
      const { error: stripeErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumber,
          billing_details: { email },
        },
      })

      if (stripeErr) {
        setError(stripeErr.message || 'Erreur de paiement.')
        setBusy(false)
        await notifyPaymentFailed()
        return
      }
      if (paymentIntent?.status !== 'succeeded') {
        setError('Paiement non abouti. Veuillez réessayer.')
        setBusy(false)
        await notifyPaymentFailed()
        return
      }

      // 2. Confirm on backend → receive signed PDF
      const res = await fetch(`${DOCX_API}/api/orders/guest-confirm`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ paymentIntentId: paymentIntent.id, orderId }),
      })

      if (!res.ok) {
        // Payment went through — PDF will arrive by email
        onSuccess(new Blob(), draft.templateName)
        return
      }

      const blob = await res.blob()
      const cd   = res.headers.get('Content-Disposition') || ''
      const match = cd.match(/filename="?([^"]+)"?/)
      const filename = match?.[1] || `${draft.fileName || draft.templateName}.pdf`
      onSuccess(blob, filename)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue.')
      await notifyPaymentFailed()
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>

      {/* ── Price summary ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
        {/* Product line */}
        <div className="flex items-start justify-between px-5 py-4 bg-gray-50 border-b border-gray-100">
          <p className="text-[13px] font-medium text-gray-800 leading-snug pr-4">{draft.templateName}</p>
          <span className="text-[13px] font-semibold text-gray-700 whitespace-nowrap">{fmt(priceTTC)}</span>
        </div>
        {/* Breakdown */}
        <div className="px-5 py-4 flex flex-col gap-1.5">
          <div className="flex justify-between text-[13px] text-gray-600">
            <span>Total HT</span><span>{fmt(priceHT)}</span>
          </div>
          <div className="flex justify-between text-[13px] text-gray-600">
            <span>TVA - 20,00%</span><span>{fmt(priceTVA)}</span>
          </div>
          <div className="flex justify-between text-[14px] font-bold text-gray-900 mt-1.5 pt-2.5 border-t border-gray-100">
            <span>Total TTC</span><span>{fmt(priceTTC)}</span>
          </div>
        </div>
      </div>

      {/* ── Email (read-only display) ── */}
      <div className="mb-5">
        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
          Adresse email (pour recevoir le document)
        </label>
        <div className="w-full py-[10px] px-3 border border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-50 select-all">
          {email}
        </div>
      </div>

      {/* ── Payment method tabs ── */}
      <div className="mb-5">
        <label className="block text-[13px] font-semibold text-gray-700 mb-2">Moyen de paiement</label>
        <div className="flex flex-col gap-2">
          {/* Card option */}
          <button
            type="button"
            onClick={() => setMethod('card')}
            className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors ${
              method === 'card' ? 'border-[#1a5450] bg-[#f0faf9]' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${method === 'card' ? 'border-[#1a5450]' : 'border-gray-300'}`}>
                {method === 'card' && <span className="w-2 h-2 rounded-full bg-[#1a5450] block" />}
              </span>
              <div className="flex items-center gap-2">
                {/* CB */}
                <svg width="28" height="18" viewBox="0 0 28 18" className="rounded-sm">
                  <rect width="28" height="18" rx="3" fill="#1a56db"/>
                  <text x="5" y="13" fontSize="9" fontWeight="700" fill="white" fontFamily="Arial">CB</text>
                </svg>
                {/* Visa */}
                <svg width="34" height="11" viewBox="0 0 34 11">
                  <text x="0" y="10" fontSize="12" fontWeight="700" fontFamily="Arial,sans-serif" fill="#1a1f71">VISA</text>
                </svg>
                {/* Mastercard */}
                <svg width="24" height="16" viewBox="0 0 24 16">
                  <circle cx="9" cy="8" r="7.5" fill="#eb001b"/>
                  <circle cx="15" cy="8" r="7.5" fill="#f79e1b" opacity="0.9"/>
                </svg>
              </div>
            </div>
            <span className="text-[13px] text-gray-500">Carte bancaire</span>
          </button>

          {/* PayPal option */}
          <button
            type="button"
            onClick={() => setMethod('paypal')}
            className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors ${
              method === 'paypal' ? 'border-[#1a5450] bg-[#f0faf9]' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${method === 'paypal' ? 'border-[#1a5450]' : 'border-gray-300'}`}>
                {method === 'paypal' && <span className="w-2 h-2 rounded-full bg-[#1a5450] block" />}
              </span>
              <span className="text-[15px] font-bold" style={{ color: '#253b80' }}>Pay</span>
              <span className="text-[15px] font-bold -ml-1.5" style={{ color: '#169bd7' }}>Pal</span>
            </div>
            <span className="text-[13px] text-gray-500">Paypal</span>
          </button>
        </div>
      </div>

      {/* ── Card fields ── */}
      {method === 'card' && (
        <div className="mb-5 flex flex-col gap-3">
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

      {method === 'paypal' && (
        <div className="mb-5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-[13px] text-blue-700">
          Le paiement PayPal n&apos;est pas encore disponible. Veuillez utiliser la carte bancaire.
        </div>
      )}

      {/* ── CGV ── */}
      <label className="flex items-start gap-2 mb-5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={cgv}
          onChange={e => setCgv(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[#1a5450] cursor-pointer shrink-0"
        />
        <span className="text-[13px] text-gray-700">
          J&apos;accepte les{' '}
          <Link href="/cgv" target="_blank" className="underline text-[#1a5450]">
            conditions générales de vente (lire les CGV)
          </Link>
        </span>
      </label>

      {/* ── Error ── */}
      {error && (
        <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">
          {error}
        </div>
      )}

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={busy || !stripe || method === 'paypal'}
        className="w-full py-4 rounded-full font-bold text-[15px] text-white border-none cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed bg-[#226d68]"
       // style={{ background: busy ? '#5da89e' : 'linear-gradient(90deg, #00c6a2 0%, #00b899 100%)' }}
      >
        {busy ? '⏳ Traitement en cours…' : 'Valider et télécharger le document'}
      </button>
    </form>
  )
}

// ─── Main page component ────────────────────────────────────────────────────
interface Props {
  initialUser: { id: string; name: string; email: string } | null
}

export default function CheckoutPage({ initialUser }: Props) {
  const router = useRouter()

  const [draft,        setDraft]        = useState<CheckoutDraft | null>(null)
  const [email,        setEmail]        = useState(initialUser?.email ?? '')
  const [emailLocked,  setEmailLocked]  = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [orderId,      setOrderId]      = useState<string | null>(null)
  const [initError,    setInitError]    = useState<string | null>(null)
  const [success,      setSuccess]      = useState(false)
  const [emailConfirm, setEmailConfirm] = useState(false) // email entered, PI created

  // Read draft from sessionStorage + auto-create PI for auth users
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('checkout_draft')
      if (!raw) { setInitError('Aucune commande en cours. Retournez sur le document.'); return }
      const parsed: CheckoutDraft = JSON.parse(raw)
      setDraft(parsed)

      if (initialUser?.email) {
        // Auth user: pre-fill email and immediately create the PaymentIntent
        setEmail(initialUser.email)
        createPaymentIntent(initialUser.email, parsed)
      }
    } catch {
      setInitError('Données de commande invalides.')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Create PaymentIntent — called manually (guest) or auto-triggered (auth)
  async function createPaymentIntent(recipientEmail: string, currentDraft: CheckoutDraft) {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(recipientEmail)) {
      setInitError('Veuillez entrer une adresse email valide.')
      return
    }
    setInitError(null)
    setEmailLocked(true)
    try {
      const res = await fetch(`${DOCX_API}/api/orders/guest-payment-intent`, {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          templateId:   currentDraft.templateId,
          templateName: currentDraft.templateName,
          values:       currentDraft.values,
          civValues:    currentDraft.civValues || {},
          price:        currentDraft.price,
          email:        recipientEmail,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur de création du paiement')
      setClientSecret(data.clientSecret)
      setOrderId(data.orderId)
      setEmailConfirm(true)
    } catch (err: unknown) {
      setInitError(err instanceof Error ? err.message : 'Erreur inattendue.')
      setEmailLocked(false)
    }
  }

  const handleEmailConfirm = () => createPaymentIntent(email, draft!)

  const handleSuccess = (blob: Blob, filename: string) => {
    setSuccess(true)
    sessionStorage.removeItem('checkout_draft')
    if (blob.size > 0) {
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    }
    // Save filled values for all users (authenticated or guest) using the checkout email
    if (draft) {
      fetch(`${DOCX_API}/api/user/documents`, {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          templateId:   draft.templateId,
          templateName: draft.templateName,
          values:       draft.values,
          labels:       draft.labels ?? {},
          email,
        }),
      }).catch(() => {})
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] font-sans">
      <Navbar />

      <div className="max-w-[520px] mx-auto px-4 py-10">

        {/* Title */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-[13px] text-gray-400 hover:text-gray-700 transition mb-3 border-none bg-transparent cursor-pointer p-0 flex items-center gap-1"
          >
            ← Retour
          </button>
          <h1 className="text-[22px] font-extrabold text-gray-900 m-0">Paiement sécurisé</h1>
          {draft && (
            <p className="text-[13px] text-gray-500 mt-1">{draft.templateName}</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-7">

          {/* ── Success state ── */}
          {success ? (
            <div className="flex flex-col items-center py-8 gap-4 text-center">
              <div className="text-5xl">✅</div>
              <h2 className="text-[18px] font-bold text-gray-900 m-0">Paiement réussi !</h2>
              <p className="text-[13px] text-gray-600 leading-relaxed m-0">
                Votre document PDF a été téléchargé automatiquement.<br />
                Une copie a également été envoyée à <strong>{email}</strong>.
              </p>
              <Link
                href="/documents"
                className="mt-2 px-6 py-3 rounded-full bg-[#1a5450] text-white font-semibold text-[14px] no-underline hover:bg-[#226d68] transition inline-block"
              >
                Retour aux documents
              </Link>
            </div>

          ) : initError && !draft ? (
            /* ── Fatal init error ── */
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <div className="text-4xl">⚠️</div>
              <p className="text-[13px] text-red-600">{initError}</p>
              <button
                onClick={() => router.back()}
                className="mt-2 px-6 py-2.5 rounded-full bg-gray-200 text-gray-700 font-semibold text-[14px] border-none cursor-pointer"
              >
                Retour
              </button>
            </div>

          ) : !draft ? (
            /* ── Loading draft ── */
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-8 h-8 border-2 border-[#1a5450] border-t-transparent rounded-full animate-spin" />
              <p className="text-[13px] text-gray-400">Chargement…</p>
            </div>

          ) : !emailConfirm ? (
            /* ── Email input step ── */
            <div>
              {draft && (
                <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
                  <div className="flex items-start justify-between px-5 py-4 bg-gray-50 border-b border-gray-100">
                    <p className="text-[13px] font-medium text-gray-800 pr-4">{draft.templateName}</p>
                    <span className="text-[13px] font-semibold whitespace-nowrap">
                      {fmt(draft.price)}
                    </span>
                  </div>
                  <div className="px-5 py-4 flex flex-col gap-1.5">
                    <div className="flex justify-between text-[13px] text-gray-600">
                      <span>Total HT</span><span>{fmt(+(draft.price / 1.2).toFixed(2))}</span>
                    </div>
                    <div className="flex justify-between text-[13px] text-gray-600">
                      <span>TVA - 20,00%</span><span>{fmt(+(draft.price - draft.price / 1.2).toFixed(2))}</span>
                    </div>
                    <div className="flex justify-between text-[14px] font-bold text-gray-900 mt-1.5 pt-2.5 border-t border-gray-100">
                      <span>Total TTC</span><span>{fmt(draft.price)}</span>
                    </div>
                  </div>
                </div>
              )}

              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                Adresse email (pour recevoir le document)
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setInitError(null) }}
                onKeyDown={e => { if (e.key === 'Enter') handleEmailConfirm() }}
                placeholder="votre@email.com"
                autoFocus
                className="w-full py-[10px] px-3 border border-gray-200 rounded-lg text-sm outline-none font-[inherit] transition-[border-color,box-shadow] box-border mb-4 focus:border-[#1a5450]"
              />
              {initError && (
                <p className="text-[12px] text-red-600 mb-3">{initError}</p>
              )}
              <button
                onClick={handleEmailConfirm}
                className="w-full py-3.5 rounded-full font-bold text-[15px] text-white border-none cursor-pointer bg-[#226d68]"
              //  style={{ background: 'linear-gradient(90deg, #00c6a2 0%, #00b899 100%)' }}
              >
                Continuer vers le paiement →
              </button>

              <p className="text-center text-[12px] text-gray-500 mt-4">
                Vous avez un abonnement ?{' '}
                <Link href={`/compte`} className="underline text-gray-600 hover:text-[#1a5450]">
                  Identifiez-vous
                </Link>
              </p>
            </div>

          ) : !clientSecret ? (
            /* ── PI loading ── */
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-8 h-8 border-2 border-[#1a5450] border-t-transparent rounded-full animate-spin" />
              <p className="text-[13px] text-gray-400">Initialisation du paiement…</p>
            </div>

          ) : (
            /* ── Stripe Elements form ── */
            <>
              {initError && (
                <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600">
                  {initError}
                </div>
              )}
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentForm
                  draft={draft}
                  email={email}
                  clientSecret={clientSecret}
                  orderId={orderId!}
                  onSuccess={handleSuccess}
                />
              </Elements>

              <p className="text-center text-[12px] text-gray-500 mt-4">
                Vous avez un abonnement ?{' '}
                <Link href="/compte" className="underline text-gray-600 hover:text-[#1a5450]">
                  Identifiez-vous
                </Link>
              </p>
            </>
          )}

        </div>

        {/* Security badge */}
        <p className="text-center text-[12px] text-gray-400 mt-4">
          🔒 Paiement sécurisé par Stripe
        </p>
      </div>
    </div>
  )
}
