'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.replace('/')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Mot de passe incorrect.')
      }
    } catch {
      setError('Erreur réseau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f7f3',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Segoe UI', Arial, sans-serif",
    }}>
      {/* Header band */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 60,
        background: '#226d68',
        display: 'flex',
        alignItems: 'center',
        padding: '0 28px',
        boxShadow: '0 2px 8px rgba(0,0,0,.18)',
      }}>
        <img src="/LogoDOCGEN.png" alt="DocGen" style={{ height: '38px', objectFit: 'contain' }} />
      </div>

      {/* Card */}
      <div style={{
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 4px 32px rgba(34,109,104,.13)',
        padding: '40px 40px 36px',
        width: '100%',
        maxWidth: 380,
        marginTop: 60,
      }}>
        <h1 style={{
          fontSize: 20, fontWeight: 800, color: '#226d68',
          marginBottom: 6, textAlign: 'center',
        }}>
          Accès administrateur
        </h1>
        <p style={{
          fontSize: 13, color: '#6b7280',
          textAlign: 'center', marginBottom: 28,
        }}>
          Entrez le mot de passe pour accéder au panneau d&apos;administration.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{
              display: 'block', fontWeight: 700,
              fontSize: 13, color: '#226d68', marginBottom: 6,
            }}>
              Mot de passe
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '9px 12px',
                border: error ? '1.5px solid #ef4444' : '1px solid #e5e7eb',
                borderRadius: 8, fontSize: 14,
                outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            {error && (
              <p style={{ color: '#ef4444', fontSize: 12, marginTop: 5 }}>{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              padding: '10px 0',
              background: loading || !password ? '#9ca3af' : '#226d68',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 15,
              cursor: loading || !password ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
