import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '../components/Navbar'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3007'

const FEATURES = [
  {
    icon: '⚡',
    title: 'Génération rapide',
    desc: 'Importez votre modèle DOCX, détectez les champs vides en un clic et générez votre document rempli en quelques secondes.',
  },
  {
    icon: '🎯',
    title: 'Formulaire intelligent',
    desc: 'Chaque champ vide est détecté automatiquement. Nommez-les pour guider vos clients lors du remplissage.',
  },
  {
    icon: '👁️',
    title: 'Aperçu en temps réel',
    desc: "Visualisez le document final tel qu'il sera téléchargé pendant la saisie, sans surprises.",
  },
  {
    icon: '📥',
    title: 'Export DOCX',
    desc: 'Téléchargez le document rempli au format Word, prêt à être envoyé ou imprimé directement.',
  },
]

const FAQ_ITEMS = [
  {
    q: 'Quels formats de fichiers sont acceptés ?',
    a: 'Actuellement, seuls les fichiers .docx (Word) sont supportés.',
  },
  {
    q: 'Comment sont détectés les champs vides ?',
    a: 'Le système détecte automatiquement les séquences de tirets bas (____) dans le document.',
  },
  {
    q: 'Mes documents sont-ils sauvegardés ?',
    a: "Les modèles publiés par l'Admin sont sauvegardés sur le serveur. Les documents remplis sont téléchargés localement.",
  },
  {
    q: 'Peut-on modifier un modèle déjà publié ?',
    a: "Pour l'instant, il faut supprimer le modèle et l'importer à nouveau. Une fonctionnalité d'édition est prévue.",
  },
]

export default function Home() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [openFaq, setOpenFaq] = useState(null)

  useEffect(() => {
    fetch(`${API}/api/templates`)
      .then(r => r.json())
      .then(data => { setTemplates(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f7f3', fontFamily: "'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes rayMove {
          0%   { transform: translateX(-100%) rotate(35deg); }
          100% { transform: translateX(200vw) rotate(35deg); }
        }
        @keyframes rayMove2 {
          0%   { transform: translateX(-100%) rotate(35deg); }
          100% { transform: translateX(200vw) rotate(35deg); }
        }
        @keyframes rayMove3 {
          0%   { transform: translateX(-100%) rotate(35deg); }
          100% { transform: translateX(200vw) rotate(35deg); }
        }
        @keyframes heroFadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroBadge {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-badge { animation: heroBadge 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .hero-title { animation: heroFadeIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s both; }
        .hero-sub   { animation: heroFadeIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.5s both; }
        .hero-btns  { animation: heroFadeIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.65s both; }
      `}</style>

      <Navbar />

      {/* HERO */}
      <section style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#226d68',
        color: 'white',
        padding: '110px 24px 120px',
        textAlign: 'center',
        minHeight: '520px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Subtle gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, #1a5450 0%, #226d68 45%, #2d8a83 100%)',
          zIndex: 0,
        }} />

        {/* Light rays */}
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 1,
        }}>
          <div style={{
            position: 'absolute', top: '-60%', left: '-20%',
            width: '18%', height: '280%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)',
            animation: 'rayMove 9s linear 0s infinite',
          }} />
          <div style={{
            position: 'absolute', top: '-60%', left: '-20%',
            width: '8%', height: '280%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)',
            animation: 'rayMove2 9s linear 2.5s infinite',
          }} />
          <div style={{
            position: 'absolute', top: '-60%', left: '-20%',
            width: '14%', height: '280%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
            animation: 'rayMove3 9s linear 5s infinite',
          }} />
          <div style={{
            position: 'absolute', top: '-60%', left: '-20%',
            width: '6%', height: '280%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)',
            animation: 'rayMove 9s linear 7s infinite',
          }} />
        </div>

        {/* Soft radial glow center */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '70%', height: '100%',
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, transparent 70%)',
          zIndex: 1,
        }} />

        {/* Content */}
        <div style={{ maxWidth: '780px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div className="hero-badge" style={{
            display: 'inline-block', marginBottom: '24px',
            padding: '5px 16px',
            backgroundColor: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '20px',
            fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.9)',
            letterSpacing: '1.5px', textTransform: 'uppercase',
          }}>
            Documents juridiques
          </div>
          <h1 className="hero-title" style={{
            margin: '0 0 20px', lineHeight: 1.15, color: 'white',
            fontSize: 'clamp(36px, 6vw, 62px)', fontWeight: '800',
            letterSpacing: '-1px',
          }}>
            Générez vos documents<br />en toute simplicité
          </h1>
          <p className="hero-sub" style={{
            margin: '0 0 44px', fontSize: 'clamp(15px, 2vw, 18px)',
            color: 'rgba(255,255,255,0.75)', lineHeight: 1.75,
            maxWidth: '580px', marginLeft: 'auto', marginRight: 'auto',
          }}>
            Importez un modèle Word, remplissez les champs personnalisés et téléchargez votre document finalisé en moins d'une minute.
          </p>
          <div className="hero-btns" style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/documents" style={{
              padding: '14px 34px',
              backgroundColor: 'white',
              color: '#226d68',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '16px',
              letterSpacing: '0.2px',
            }}>
              Voir les documents
            </Link>
            <Link href="/admin" style={{
              padding: '14px 34px',
              backgroundColor: 'transparent',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '16px',
              border: '1.5px solid rgba(255,255,255,0.4)',
            }}>
              Espace Admin
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '72px 24px', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: '700', color: '#226d68', marginBottom: '8px' }}>
            Tout ce dont vous avez besoin
          </h2>
          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '16px', marginBottom: '48px', marginTop: 0 }}>
            Une solution simple et efficace pour automatiser vos documents
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '24px' }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                padding: '28px 24px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#f8f7f3',
              }}>
                <div style={{ fontSize: '36px', marginBottom: '14px' }}>{f.icon}</div>
                <h3 style={{ margin: '0 0 10px', fontSize: '16px', fontWeight: '700', color: '#226d68' }}>{f.title}</h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DOCUMENTS */}
        <section style={{ padding: '72px 24px', backgroundColor: '#f8f7f3' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: '700', color: '#226d68' }}>Documents disponibles</h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Sélectionnez un modèle pour commencer</p>
            </div>
            <Link href="/documents" style={{
              padding: '9px 20px',
              backgroundColor: '#e5e7eb',
              color: '#226d68',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              border: '1px solid #d1d5db',
            }}>
              Voir tout →
            </Link>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>⏳ Chargement...</div>
          )}

          {!loading && templates.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
              <p style={{ fontSize: '48px', margin: '0 0 12px' }}>📭</p>
              <p style={{ fontSize: '15px' }}>
                Aucun modèle disponible.{' '}
                <Link href="/admin" style={{ color: '#226d68', fontWeight: '600' }}>Importer un document</Link>.
              </p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {templates.slice(0, 6).map(t => (
              <div key={t.id} style={{
                backgroundColor: 'white',
                borderRadius: '10px',
                padding: '22px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                border: '1px solid #e5e7eb',
              }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '10px',
                  backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '22px', marginBottom: '14px',
                }}>📋</div>
                <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '700', color: '#226d68' }}>{t.name}</h3>
                <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#9ca3af' }}>📁 {t.fileName}</p>
                <p style={{ margin: '0 0 18px', fontSize: '12px', color: '#9ca3af' }}>
                  🔲 {t.blanksCount} champ{t.blanksCount > 1 ? 's' : ''} · {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                </p>
                <Link href={`/fill/${t.id}`} style={{
                  display: 'block', textAlign: 'center', padding: '9px',
                  backgroundColor: '#226d68', color: 'white', textDecoration: 'none',
                  borderRadius: '6px', fontSize: '14px', fontWeight: '600',
                }}>
                  ✏️ Remplir
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: '72px 24px', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: '700', color: '#226d68', marginBottom: '8px' }}>
            Questions fréquentes
          </h2>
          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '15px', marginBottom: '40px', marginTop: 0 }}>
            Tout ce que vous devez savoir sur DocGen
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundColor: openFaq === i ? '#f8f7f3' : 'white',
              }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '18px 20px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '15px', fontWeight: '600', color: '#226d68',
                  }}
                >
                  {item.q}
                  <span style={{ color: '#226d68', fontSize: '22px', fontWeight: '300', marginLeft: '12px', lineHeight: 1 }}>
                    {openFaq === i ? '−' : '+'}
                  </span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 20px 18px', fontSize: '14px', color: '#6b7280', lineHeight: 1.7 }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ backgroundColor: '#226d68', color: '#9ca3af', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '700', color: 'white' }}>📄 DocGen</p>
        <p style={{ margin: 0, fontSize: '13px' }}>© {new Date().getFullYear()} DocGen — Tous droits réservés</p>
      </footer>
    </div>
  )
}
