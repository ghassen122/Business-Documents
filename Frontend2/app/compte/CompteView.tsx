'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '../(components)/Navbar'
import { useLoginMutation, useRegisterMutation, useLogoutMutation } from '@/state/api/authApi'
import { useRemoveDocumentMutation, useSaveDocumentMutation, useGetMyDocumentsQuery } from '@/state/api/userApi'
import { useVerifyOrderMutation, useGetMyOrdersQuery } from '@/state/api/orderApi'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import { setUser, clearUser } from '@/state/slices/authSlice'
import { userApi } from '@/state/api/userApi'
import type { AuthUser } from '@/state/api/authApi'
import type { UserDocument } from '@/types/document'

const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || 'http://13.61.104.59:4001'

interface Props {
  initialUser: AuthUser | null
  initialDocs: UserDocument[]
}

export default function CompteView({ initialUser, initialDocs }: Props) {
  const router   = useRouter()
  const dispatch = useAppDispatch()
  const authUser = useAppSelector(state => state.auth.user)
  const authHydrated = useAppSelector(state => state.auth.hydrated)
  const user = authHydrated ? authUser : initialUser

  const [mode,       setMode]       = useState<'login' | 'register'>('login')
  const [name,       setName]       = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [error,      setError]      = useState('')

  // Fetch docs client-side — skipped until user is known, auto-refetches after login
  const { data: myDocs = initialDocs, refetch: refetchDocs } = useGetMyDocumentsQuery(undefined, {
    skip: !user,
  })

  const [login,          { isLoading: loggingIn }]    = useLoginMutation()
  const [register,       { isLoading: registering }]  = useRegisterMutation()
  const [logoutMutation, { isLoading: loggingOut }]   = useLogoutMutation()
  const [removeDocument]  = useRemoveDocumentMutation()
  const [saveDocument]    = useSaveDocumentMutation()
  const [verifyOrder]     = useVerifyOrderMutation()

  // Paid orders — fetched client-side
  const { data: myOrders = [] } = useGetMyOrdersQuery(undefined, { skip: !user })

  const [verifyMsg, setVerifyMsg] = useState<string | null>(null)
  const [dlBusy,       setDlBusy]       = useState<string | null>(null)   // orderId being downloaded (DOCX)
  const [dlBusyPdf,    setDlBusyPdf]    = useState<string | null>(null)   // orderId being downloaded (PDF)
  const [dlDocBusy,    setDlDocBusy]    = useState<string | null>(null) // doc._id being downloaded (DOCX)
  const [dlDocBusyPdf, setDlDocBusyPdf] = useState<string | null>(null) // doc._id being downloaded (PDF)

  useEffect(() => {
    if (authHydrated) return
    if (initialUser) dispatch(setUser(initialUser))
  }, [authHydrated, dispatch, initialUser])

  // ── Auto-verify Stripe payment on redirect back ───────────────────────────
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search)
    const orderId   = params.get('order_id')
    const sessionId = params.get('session_id')
    if (!orderId || !sessionId) return
    verifyOrder({ orderId, sessionId })
      .unwrap()
      .then(result => {
        setVerifyMsg(result.success ? '✅ Paiement confirmé ! Votre document est prêt.' : '❌ Paiement non abouti.')
        router.replace('/compte')   // clean URL
      })
      .catch(() => setVerifyMsg('❌ Erreur lors de la vérification du paiement.'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Téléchargement d'une commande payée ────────────────────────────────────
  async function handleDownloadOrder(orderId: string, fileName: string) {
    setDlBusy(orderId)
    try {
      const res = await fetch(`${BACKEND_API}/api/orders/${orderId}/download`, {
        method:      'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erreur de téléchargement')
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = fileName || 'document.docx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      alert(`Erreur : ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setDlBusy(null)
    }
  }

  // ── Téléchargement PDF d'une commande payée ──────────────────────────────
  async function handleDownloadOrderPdf(orderId: string, fileName: string) {
    setDlBusyPdf(orderId)
    try {
      const res = await fetch(`${BACKEND_API}/api/orders/${orderId}/download-pdf`, {
        method:      'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erreur de téléchargement')
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = fileName.replace(/\.docx$/i, '') + '.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      alert(`Erreur : ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setDlBusyPdf(null)
    }
  }

  const submitting = loggingIn || registering

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    try {
      const data = mode === 'login'
        ? await login({ email, password }).unwrap()
        : await register({ name, email, password }).unwrap()

      dispatch(setUser(data))
      router.refresh() // invalidate Next.js router cache so page.tsx re-runs server-side auth check
      // RTK useGetMyDocumentsQuery auto-fetches now that user is set (skip:false)
      // Handle pending saves / redirects
      const pendingRaw = sessionStorage.getItem('pendingSave')
      if (pendingRaw) {
        sessionStorage.removeItem('pendingSave')
        await saveDocument(JSON.parse(pendingRaw))
        router.push('/documents')
        return
      }
      const redirectTo = sessionStorage.getItem('redirectAfterLogin')
      if (redirectTo) {
        sessionStorage.removeItem('redirectAfterLogin')
        router.push(redirectTo)
        return
      }
    } catch (err: any) {
      setError(err?.data?.error || 'Erreur de connexion.')
    }
  }

  async function handleLogout() {
    await logoutMutation()
    dispatch(userApi.util.resetApiState()) // clear all cached docs so next user starts fresh
    dispatch(clearUser())
    router.push('/') // redirect home → pathname change triggers Navbar to re-fetch /api/auth/me
  }

  async function handleRemoveDoc(templateId: string) {
    try {
      await removeDocument(templateId).unwrap()
      // RTK invalidates UserDocuments tag → useGetMyDocumentsQuery auto-refetches
    } catch {}
  }

  // ── Téléchargement DOCX d'un document sauvegardé ─────────────────────────
  async function handleDownloadDoc(doc: UserDocument, format: 'docx' | 'pdf') {
    const setter = format === 'docx' ? setDlDocBusy : setDlDocBusyPdf
    setter(doc._id)
    try {
      const url = format === 'docx'
        ? `${BACKEND_API}/api/fill/${doc.templateId}`
        : `${BACKEND_API}/api/fill/${doc.templateId}/lo-pdf`
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ values: doc.values ?? {} }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any).error || 'Erreur de génération')
      }
      const blob = await res.blob()
      const a    = document.createElement('a')
      a.href     = URL.createObjectURL(blob)
      const base = doc.templateName || 'document'
      a.download = format === 'docx' ? `${base}.docx` : `${base}.pdf`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err: unknown) {
      alert(`Erreur : ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setter(null)
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loggingOut) return (
    <div className="min-h-screen bg-cream font-sans">
      <Navbar />
      <p className="pt-20 text-center text-gray-400">Déconnexion...</p>
    </div>
  )

  // ── Vue connectée ─────────────────────────────────────────────────────────
  if (user) return (
    <div className="min-h-screen bg-cream font-sans">
      <Navbar />
      <div className="mx-auto my-12 max-w-[700px] px-6">

        {/* Bannière paiement */}
        {verifyMsg && (
          <div className={`mb-6 rounded-xl border px-6 py-4 text-sm font-semibold ${
            verifyMsg.startsWith('✅')
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-600'
          }`}>
            {verifyMsg}
          </div>
        )}

        {/* Carte profil */}
        <div className="mb-7 rounded-xl border border-gray-200 bg-white px-8 py-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="mb-1.5 text-[32px]">👤</div>
              <h2 className="m-0 text-xl font-bold text-brand">{user.name}</h2>
              <p className="m-0 mt-1 text-sm text-gray-500">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-red-500 bg-white px-[18px] py-2 text-[13px] font-semibold text-red-500 transition-colors hover:bg-red-50">
              Déconnexion
            </button>
          </div>
        </div>

        {/* Mes documents */}
        <div className="rounded-xl border border-gray-200 bg-white px-8 py-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h3 className="m-0 text-[17px] font-bold text-brand">
              📁 Mes documents sauvegardés
            </h3>
            <Link
              href="/documents"
              className="rounded-md border border-gray-200 px-[14px] py-1.5 text-[13px] font-semibold text-brand no-underline transition-colors hover:bg-cream">
              + Parcourir les documents
            </Link>
          </div>

          {myDocs.length === 0 ? (
            <div className="py-8 text-center">
              <p className="mb-3 text-[32px]">📭</p>
              <p className="text-sm text-gray-400">Aucun document sauvegardé pour l&apos;instant.</p>
              <Link
                href="/documents"
                className="mt-3 inline-block rounded-md bg-brand px-5 py-2 text-[13px] font-semibold text-white no-underline transition-colors hover:bg-brand-dark">
                Parcourir les documents
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {myDocs.map((doc) => (
                <div key={doc._id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-cream px-4 py-[14px]">
                  <div>
                    <div className="text-sm font-semibold text-navy">
                      {doc.templateName || doc.templateId}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      {new Date(doc.savedAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadDoc(doc, 'docx')}
                      disabled={dlDocBusy === doc._id}
                      className="rounded-md bg-brand px-[14px] py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark disabled:bg-gray-400 disabled:cursor-not-allowed">
                      {dlDocBusy === doc._id ? '⏳…' : '📥 DOCX'}
                    </button>
                    <button
                      onClick={() => handleDownloadDoc(doc, 'pdf')}
                      disabled={dlDocBusyPdf === doc._id}
                      className="rounded-md border border-brand bg-white px-[14px] py-1.5 text-[13px] font-semibold text-brand transition-colors hover:bg-cream disabled:opacity-50 disabled:cursor-not-allowed">
                      {dlDocBusyPdf === doc._id ? '⏳…' : '📄 PDF'}
                    </button>
                    <Link
                      href={`/fill/${doc.templateId}`}
                      className="rounded-md border border-gray-200 px-[14px] py-1.5 text-[13px] font-semibold text-brand no-underline transition-colors hover:bg-cream">
                      ✏️ Remplir
                    </Link>
                    <button
                      onClick={() => handleRemoveDoc(doc.templateId)}
                      className="rounded-md border border-red-500 bg-white px-3 py-1.5 text-[13px] font-semibold text-red-500 transition-colors hover:bg-red-50">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Mes commandes payées ──────────────────────────────────────── */}
        {myOrders.length > 0 && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white px-8 py-6">
            <h3 className="m-0 mb-5 text-[17px] font-bold text-brand">
              💳 Mes documents achetés
            </h3>
            <div className="flex flex-col gap-3">
              {myOrders.map(order => (
                <div key={order._id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-cream px-4 py-[14px]">
                  <div>
                    <div className="text-sm font-semibold text-navy">
                      {order.templateName || order.templateId}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR')} · {order.amount} €
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadOrder(order._id, `${order.templateName || 'document'}.docx`)}
                      disabled={dlBusy === order._id}
                      className="rounded-md bg-brand px-[14px] py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark disabled:bg-gray-400 disabled:cursor-not-allowed">
                      {dlBusy === order._id ? '⏳…' : '📥 DOCX'}
                    </button>
                    <button
                      onClick={() => handleDownloadOrderPdf(order._id, `${order.templateName || 'document'}.docx`)}
                      disabled={dlBusyPdf === order._id}
                      className="rounded-md border border-brand bg-white px-[14px] py-1.5 text-[13px] font-semibold text-brand transition-colors hover:bg-cream disabled:opacity-50 disabled:cursor-not-allowed">
                      {dlBusyPdf === order._id ? '⏳…' : '📄 PDF'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // ── Vue déconnectée ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cream font-sans">
      <Navbar />

      <div
        className="mb-10 px-6 py-12 text-center text-white"
        style={{ background: 'linear-gradient(160deg, #1a5450 0%, #226d68 55%, #2d8a83 100%)' }}>
        <h1 className="m-0 mb-2 text-[28px] font-extrabold">
          {mode === 'login' ? '🔐 Connexion' : '✨ Créer un compte'}
        </h1>
        <p className="m-0 text-[15px] text-white/75">
          {mode === 'login'
            ? 'Accédez à vos documents sauvegardés'
            : 'Rejoignez DocGen pour sauvegarder vos documents'}
        </p>
      </div>

      <div className="mx-auto max-w-[420px] px-6 pb-[60px]">
        {/* Tabs */}
        <div className="mb-7 flex overflow-hidden rounded-[10px] border border-gray-200">
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className={`flex-1 border-none px-3 py-3 text-sm font-bold transition-colors ${
                mode === m ? 'bg-brand text-white' : 'bg-white text-gray-500 hover:bg-cream'
              }`}>
              {m === 'login' ? '🔐 Connexion' : "✨ S'inscrire"}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-7">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4">
              {mode === 'register' && (
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">
                    Nom complet
                  </label>
                  <input
                    className="fill-input box-border w-full rounded-lg border border-gray-200 bg-white px-[14px] py-[10px] text-sm outline-none"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jean Dupont"
                    required
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">
                  Adresse email
                </label>
                <input
                  className="fill-input box-border w-full rounded-lg border border-gray-200 bg-white px-[14px] py-[10px] text-sm outline-none"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jean@exemple.fr"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">
                  Mot de passe
                </label>
                <input
                  className="fill-input box-border w-full rounded-lg border border-gray-200 bg-white px-[14px] py-[10px] text-sm outline-none"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-[14px] py-[10px] text-[13px] text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-brand py-[11px] text-[15px] font-bold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-gray-400">
                {submitting
                  ? '⏳ Chargement...'
                  : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
