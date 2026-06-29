'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import { clearUser, setUser } from '@/state/slices/authSlice'
import type { AuthUser } from '@/state/api/authApi'

const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || 'http://backend:4001'

const NAV_LINKS = [
  { href: '/',          label: 'Accueil'   },
  { href: '/documents', label: 'Documents' },
  { href: '/faq',       label: 'FAQ'       },
]

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const user = useAppSelector(state => state.auth.user)
  const [dropdown, setDropdown] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    fetch(`${BACKEND_API}/api/auth/me`, { credentials: 'include' })
      .then(r => {
        if (r.ok) return r.json() as Promise<AuthUser>
        if (r.status === 401) return null
        throw new Error('Auth check failed')
      })
      .then(data => {
        if (cancelled) return
        if (data) dispatch(setUser(data))
        else dispatch(clearUser())
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [dispatch, pathname])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    await fetch(`${BACKEND_API}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    dispatch(clearUser())
    setDropdown(false)
    router.push('/')
  }

  return (
    <nav style={{
      backgroundColor: 'white',
      boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
      borderBottom: '2px solid #226d68',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '88px',
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/LogoDOCGEN.png" alt="DocGen" style={{ height: '80px', width: 'auto', display: 'block' }} />
        </Link>

        {/* Links */}
        <div style={{ display: 'flex', gap: '60px', alignItems: 'center' }}>
          {NAV_LINKS.map(link => {
            const active = pathname === link.href
            return (
              <Link key={link.href} href={link.href} style={{
                color: '#226d68',
                textDecoration: 'none',
                padding: '8px 4px',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: '700',
                borderBottom: active ? '2px solid #226d68' : '2px solid transparent',
                transition: 'border-color 0.15s',
                fontFamily: 'sans-serif',
              }}>
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Auth button */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          {user ? (
            <>
              <button
                onClick={() => setDropdown(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '9px 18px', border: '2px solid #226d68',
                  borderRadius: '8px', backgroundColor: '#226d68',
                  color: 'white', fontWeight: '700', fontSize: '15px',
                  cursor: 'pointer', fontFamily: 'sans-serif',
                }}
              >
                <span>👤</span>
                <span>{user.name.split(' ')[0]}</span>
                <span style={{ fontSize: '11px', opacity: 0.8 }}>▾</span>
              </button>
              {dropdown && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  backgroundColor: 'white', border: '1px solid #e5e7eb',
                  borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                  minWidth: '180px', overflow: 'hidden', zIndex: 9999,
                }}>
                  <Link href="/compte" onClick={() => setDropdown(false)} style={{
                    display: 'block', padding: '12px 18px',
                    color: '#226d68', textDecoration: 'none',
                    fontWeight: '600', fontSize: '14px',
                    borderBottom: '1px solid #f0f0f0',
                  }}>
                    👤 Mon compte
                  </Link>
                  <button onClick={handleLogout} style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '12px 18px', color: '#ef4444',
                    background: 'none', border: 'none',
                    fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                  }}>
                    🚪 Déconnexion
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link href="/compte" style={{
              padding: '9px 20px', border: '2px solid #226d68',
              borderRadius: '8px', color: '#226d68',
              textDecoration: 'none', fontWeight: '700',
              fontSize: '15px', fontFamily: 'sans-serif',
            }}>
              Connexion
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
