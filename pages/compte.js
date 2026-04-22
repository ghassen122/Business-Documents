import Navbar from '../components/Navbar'
import Link from 'next/link'

export default function Compte() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', fontFamily: "'Segoe UI', sans-serif" }}>
      <Navbar />
      <div style={{ maxWidth: '500px', margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>👤</div>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1f2937', marginBottom: '12px' }}>Espace compte</h1>
        <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: 1.6, marginBottom: '28px' }}>
          La gestion des comptes utilisateurs sera disponible prochainement.
        </p>
        <Link href="/" style={{
            padding: '10px 24px', backgroundColor: '#1f2937', color: 'white',
          textDecoration: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px',
        }}>
          ← Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}
