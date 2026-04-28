import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'

const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || 'http://localhost:3007'

export default function Compte() {
  const router = useRouter()
  const [mode, setMode]         = useState('login')
  const [user, setUser]         = useState(null)
  const [myDocs, setMyDocs]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`${BACKEND_API}/api/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) { setUser(data); fetchMyDocs() }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function fetchMyDocs() {
    fetch(`${BACKEND_API}/api/user/documents`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(setMyDocs)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setSubmitting(true)
    const endpoint = mode === 'login' ? `${BACKEND_API}/api/auth/login` : `${BACKEND_API}/api/auth/register`
    const body = mode === 'login' ? { email, password } : { name, email, password }
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error || 'Erreur.'); setSubmitting(false); return }
      setUser(data)

      // Handle pending document save (from documents page)
      const pending = sessionStorage.getItem('pendingSave')
      if (pending) {
        sessionStorage.removeItem('pendingSave')
        const doc = JSON.parse(pending)
        await fetch(`${BACKEND_API}/api/user/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(doc),
        })
        router.push('/documents')
        return
      }

      // Handle redirect back to fill page (from fill page mask)
      const redirectTo = sessionStorage.getItem('redirectAfterLogin')
      if (redirectTo) {
        sessionStorage.removeItem('redirectAfterLogin')
        router.push(redirectTo)
        return
      }

      fetchMyDocs()
    } catch {
      setError('Erreur réseau.')
    }
    setSubmitting(false)
  }

  async function handleLogout() {
    await fetch(`${BACKEND_API}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    setUser(null); setMyDocs([])
  }

  async function removeDoc(templateId) {
    const r = await fetch(`${BACKEND_API}/api/user/documents`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ templateId }),
    })
    if (r.ok) setMyDocs(await r.json())
  }

  if (loading) return (
    <div className="min-h-screen bg-cream font-sans">
      <Navbar />
      <p className="pt-20 text-center text-gray-400">Chargement...</p>
    </div>
  )

  // ── Vue connectée ──
  if (user) return (
    <div className="min-h-screen bg-cream font-sans">
      <Navbar />
      <div className="mx-auto my-12 max-w-[700px] px-6">

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
              <p className="text-sm text-gray-400">Aucun document sauvegardé pour l'instant.</p>
              <Link
                href="/documents"
                className="mt-3 inline-block rounded-md bg-brand px-5 py-2 text-[13px] font-semibold text-white no-underline transition-colors hover:bg-brand-dark">
                Parcourir les documents
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {myDocs.map((doc, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-gray-200 bg-cream px-4 py-[14px]">
                  <div>
                    <div className="text-sm font-semibold text-navy">
                      {doc.templateName || doc.templateId}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      {doc.fileName || ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/fill/${doc.templateId}`}
                      className="rounded-md bg-brand px-[14px] py-1.5 text-[13px] font-semibold text-white no-underline transition-colors hover:bg-brand-dark">
                      Remplir
                    </Link>
                    <button
                      onClick={() => removeDoc(doc.templateId)}
                      className="rounded-md border border-red-500 bg-white px-3 py-1.5 text-[13px] font-semibold text-red-500 transition-colors hover:bg-red-50">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ── Vue déconnectée ──
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
          {mode === 'login' ? 'Accédez à vos documents sauvegardés' : 'Rejoignez DocGen pour sauvegarder vos documents'}
        </p>
      </div>

      <div className="mx-auto max-w-[420px] px-6 pb-[60px]">
        {/* Tabs */}
        <div className="mb-7 flex overflow-hidden rounded-[10px] border border-gray-200">
          {['login', 'register'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); setSuccess('') }}
              className={`flex-1 border-none px-3 py-3 text-sm font-bold transition-colors ${mode === m ? 'bg-brand text-white' : 'bg-white text-gray-500 hover:bg-cream'}`}>
              {m === 'login' ? '🔐 Connexion' : '✨ S\'inscrire'}
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
                    className="fill-input w-full rounded-lg border border-gray-200 bg-white px-[14px] py-[10px] text-sm outline-none box-border"
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
                  className="fill-input w-full rounded-lg border border-gray-200 bg-white px-[14px] py-[10px] text-sm outline-none box-border"
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
                  className="fill-input w-full rounded-lg border border-gray-200 bg-white px-[14px] py-[10px] text-sm outline-none box-border"
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
              {success && (
                <div className="rounded-md border border-green-200 bg-green-50 px-[14px] py-[10px] text-[13px] text-green-600">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-brand py-[11px] text-[15px] font-bold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-gray-400">
                {submitting ? '⏳ Chargement...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
