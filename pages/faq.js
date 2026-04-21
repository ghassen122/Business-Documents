import Navbar from '../components/Navbar'
import Link from 'next/link'
import { useState } from 'react'

const FAQ_ITEMS = [
  { q: 'Quels formats de fichiers sont acceptés ?', a: 'Actuellement, seuls les fichiers .docx (Word) sont supportés.' },
  { q: 'Comment sont détectés les champs vides ?', a: 'Le système détecte automatiquement les séquences de tirets bas (____) dans le document Word.' },
  { q: 'Mes documents sont-ils sauvegardés sur le serveur ?', a: "Les modèles publiés par l'administrateur sont sauvegardés. Les documents remplis sont téléchargés directement sur votre ordinateur." },
  { q: 'Puis-je modifier un modèle après publication ?', a: "Pour l'instant, supprimez le modèle existant et importez une nouvelle version depuis l'espace Admin." },
  { q: 'Le service fonctionne-t-il sans connexion internet ?', a: 'Oui, si vous exécutez le serveur en local. Aucune donnée n\'est envoyée vers des serveurs externes.' },
  { q: 'Comment nommer les champs vides détectés ?', a: "Dans l'espace Admin, après avoir importé votre DOCX, chaque champ vide détecté s'affiche avec un encadré où vous pouvez saisir un nom descriptif (ex: Nom du client, Date de signature)." },
]

export default function FAQ() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#e3e6e6', fontFamily: "'Segoe UI', sans-serif" }}>
      <Navbar />

      <div style={{ backgroundColor: '#c9f0f2', padding: '40px 24px', color: '#1f2937', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: '800' }}>❓ Questions fréquentes</h1>
        <p style={{ margin: 0, color: '#4b5563', fontSize: '15px' }}>
          Tout ce que vous devez savoir sur DocGen
        </p>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} style={{
              border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden',
              backgroundColor: openFaq === i ? '#c9f0f2' : 'white',
            }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%', textAlign: 'left', padding: '18px 20px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: '15px', fontWeight: '600', color: '#1f2937',
                }}
              >
                {item.q}
                <span style={{ color: '#1f2937', fontSize: '22px', fontWeight: '300', marginLeft: '12px', lineHeight: 1 }}>
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
            padding: '10px 24px', backgroundColor: '#c9f0f2', color: '#1f2937',
            textDecoration: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', border: '1px solid #b0d8da',
          }}>
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
