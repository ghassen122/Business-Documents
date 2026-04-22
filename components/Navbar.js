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
          <span style={{ color: '#1f2937', fontWeight: '800', fontSize: '20px', letterSpacing: '0.3px', fontFamily: 'sans-serif' }}>
            DocGen
          </span>
        </Link>

        {/* Desktop links */}
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center', justifyContent: 'space-between' }}>
          {LINKS.map(link => {
            const active = router.pathname === link.href
            return (
              <Link key={link.href} href={link.href} style={{
                color: active ? '#1f2937' : '#374151',
                textDecoration: 'none',
                padding: '8px 4px',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: '700',
                borderBottom: active ? '2px solid #111827' : '2px solid transparent',
                transition: 'border-color 0.15s',
                fontFamily: 'sans-serif',
              }}>
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Admin button */}
        <Link href="/admin" style={{
          padding: '9px 22px',
          backgroundColor: '#1f2937',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: '700',
          fontFamily: 'sans-serif',
        }}>
          🔧 Admin
        </Link>
      </div>
    </nav>
  )
}
