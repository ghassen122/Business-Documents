import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'

const BACKEND_API = process.env.NEXT_PUBLIC_BACKEND_API || 'http://localhost:3007'

const NAV_LINKS = [
  { href: '/',          label: 'Accueil'   },
  { href: '/documents', label: 'Documents' },
  { href: '/faq',       label: 'FAQ'       },
]

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [dropdown, setDropdown] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetch(`${BACKEND_API}/api/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data))
      .catch(() => {})
  }, [router.pathname])

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
    setUser(null)
    setDropdown(false)
    router.push('/')
  }

  return (
    <nav style={{
      backgroundColor: 'white',
      boxShadow: '0 1px 0px #e5e7eb',
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
        height: '72px',
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>📄</span>
          <span style={{ color: '#226d68', fontWeight: '800', fontSize: '20px', letterSpacing: '0.3px', fontFamily: 'sans-serif' }}>
            DocGen
          </span>
        </Link>

        {/* Links */}
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          {NAV_LINKS.map(link => {
            const active = router.pathname === link.href
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
