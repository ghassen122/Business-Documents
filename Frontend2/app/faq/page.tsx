'use client'
import Navbar from '../(components)/Navbar'
import Link from 'next/link'
import { useState } from 'react'

const FAQ_ITEMS = [
  {
    q: 'Comment remplir et télécharger un document ?',
    a: `Choisissez un modèle dans la liste des documents disponibles. Le document s'affiche en temps réel pendant que vous remplissez les champs du formulaire : les blancs se complètent automatiquement au fur et à mesure de votre saisie. Une fois tous les champs remplis, cliquez sur "Télécharger DOCX" pour obtenir votre document finalisé au format Word, prêt à l'emploi.`,
  },

  {
    q: 'Quels formats de fichiers sont acceptés ?',
    a: `.docx (Microsoft Word) est accepté pour l'import de modèles. Le téléchargement du document finalisé se fait également au format .docx ou PDF `,
  },
  {
    q: 'Mes documents sont-ils sauvegardés sur le serveur ?',
    a: `Les modèles publiés par l'administrateur sont sauvegardés sur le serveur et disponibles pour tous les utilisateurs. En revanche, les documents que vous remplissez et téléchargez ne sont jamais stockés : ils sont générés à la volée et téléchargés directement sur votre ordinateur.`,
  },
  {
    q: 'Suis-je obligé de remplir tous les champs du formulaire ?',
    a: `Non, mais c'est fortement recommandé. Les champs non remplis apparaîtront vides dans le document final. Pour un résultat optimal, veillez à compléter tous les champs avant de télécharger votre document.`,
  },
  {
    q: 'Le service est-il sécurisé ?',
    a: `Oui. Aucune donnée personnelle n'est collectée lors du remplissage des documents. Les fichiers générés sont créés en local et téléchargés directement sur votre appareil sans passer par un service tiers. Si vous exécutez le serveur en local, aucune donnée ne quitte votre réseau.`,
  },

]

export default function FAQ() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div className='min-h-100'                   style={{ minHeight: '100vh', backgroundColor: '#f8f7f3', fontFamily: "'Segoe UI', sans-serif" }}>
      <Navbar />

      <div style={{
        background: 'linear-gradient(160deg, #1a5450 0%, #226d68 55%, #2d8a83 100%)',
        padding: '56px 24px',
        color: 'white',
        textAlign: 'center',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '32px', fontWeight: '800' }}>❓ Questions fréquentes</h1>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '15px' }}>
          Tout ce que vous devez savoir sur DocGen
        </p>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} style={{
              border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden',
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

        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <p style={{ color: '#6b7280', fontSize: '15px', marginBottom: '16px' }}>Vous n'avez pas trouvé votre réponse ?</p>
          <Link href="/" style={{
            padding: '10px 24px', backgroundColor: '#226d68', color: 'white',
            textDecoration: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px',
          }}>
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
