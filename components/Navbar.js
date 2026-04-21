import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'

const LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/documents', label: 'Documents' },
  { href: '/compte', label: 'Compte' },
  { href: '/faq', label: 'FAQ' },
]

export default function Navbar() {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav style={{
      backgroundColor: '#c9f0f2',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '26px' }}>📄</span>
          <span style={{ color: '#1f2937', fontWeight: '700', fontSize: '18px', letterSpacing: '0.3px', fontFamily: 'sans-serif' }}>
            DocGen
          </span>
        </Link>

        {/* Desktop links */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {LINKS.map(link => {
            const active = router.pathname === link.href
            return (
              <Link key={link.href} href={link.href} style={{
                color: active ? '#1f2937' : '#4b5563',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: active ? '700' : '500',
                backgroundColor: active ? 'rgba(0,0,0,0.08)' : 'transparent',
                transition: 'background 0.15s',
                fontFamily: 'sans-serif',
              }}>
                {link.label}
              </Link>
            )
          })}
          <Link href="/admin" style={{
            marginLeft: '12px',
            padding: '8px 18px',
            backgroundColor: '#1f2937',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '700',
            fontFamily: 'sans-serif',
          }}>
            🔧 Admin
          </Link>
        </div>
      </div>
    </nav>
  )
}
