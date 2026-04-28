import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '../components/Navbar'

const DOCX_API = process.env.NEXT_PUBLIC_DOCX_API || 'http://localhost:4000'

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
    fetch(`${DOCX_API}/api/templates`)
      .then(r => r.json())
      .then(data => { setTemplates(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-cream font-sans">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden text-white text-center flex items-center justify-center py-[140px] px-6 min-h-[680px] bg-brand">
        {/* Gradient overlay */}
        <div className="absolute inset-0 z-0" style={{ background: 'linear-gradient(160deg, #1a5450 0%, #226d68 45%, #2d8a83 100%)' }} />

        {/* 4 light rays */}
        <div className="absolute inset-0 overflow-hidden z-[1]">
          <div className="absolute top-[-60%] left-[-20%] h-[280%] animate-ray1" style={{ width: '18%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)' }} />
          <div className="absolute top-[-60%] left-[-20%] h-[280%] animate-ray2" style={{ width: '8%',  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)' }} />
          <div className="absolute top-[-60%] left-[-20%] h-[280%] animate-ray3" style={{ width: '14%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
          <div className="absolute top-[-60%] left-[-20%] h-[280%] animate-ray4" style={{ width: '6%',  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)' }} />
        </div>

        {/* Floating orbs */}
        <div className="absolute w-[340px] h-[340px] rounded-full animate-orb1 z-[1]"
          style={{ top: '18%', left: '8%', background: 'radial-gradient(circle, rgba(255,255,255,0.13) 0%, transparent 70%)' }} />
        <div className="absolute w-[260px] h-[260px] rounded-full animate-orb2 z-[1]"
          style={{ bottom: '10%', right: '6%', background: 'radial-gradient(circle, rgba(167,243,208,0.18) 0%, transparent 70%)' }} />
        <div className="absolute z-[1]"
          style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '70%', height: '100%', background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, transparent 70%)' }} />

        {/* Content */}
        <div className="max-w-[780px] mx-auto relative z-[2]">
          <div
            className="animate-hero-badge inline-block mb-6 px-4 py-[5px] border border-white/25 rounded-[20px] text-[12px] font-bold text-white/90 uppercase tracking-[1.5px]"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
            Documents juridiques
          </div>
          <h1
            className="animate-hero-title mb-5 text-white font-extrabold leading-[1.15]"
            style={{ fontSize: 'clamp(36px, 6vw, 62px)', letterSpacing: '-1px' }}>
            Générez vos documents<br />en toute simplicité
          </h1>
          <p
            className="animate-hero-sub mb-11 text-white/75 leading-7 max-w-[580px] mx-auto"
            style={{ fontSize: 'clamp(15px, 2vw, 18px)' }}>
            Importez un modèle Word, remplissez les champs personnalisés et téléchargez votre document finalisé en moins d'une minute.
          </p>
          <div className="animate-hero-btns flex gap-3.5 justify-center flex-wrap">
            <Link
              href="/documents"
              className="hero-btn-primary px-[34px] py-[14px] bg-white text-brand no-underline rounded-lg font-bold text-base shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-[transform,box-shadow] duration-[180ms]"
              style={{ letterSpacing: '0.2px' }}>
              Voir les documents
            </Link>
            <Link
              href="/faq"
              className="hero-btn-secondary px-[34px] py-[14px] bg-transparent text-white no-underline rounded-lg font-semibold text-base border border-white/40 transition-[background,border-color] duration-[180ms]">
              En savoir plus
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-[72px] px-6 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-center text-[28px] font-bold text-brand mb-2">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-center text-gray-500 text-base mb-12 mt-0">
            Une solution simple et efficace pour automatiser vos documents
          </p>
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="feat-card p-7 rounded-xl border border-gray-200 bg-cream transition-[transform,box-shadow] duration-[220ms]"
                style={{ animationDelay: `${0.1 + i * 0.1}s` }}>
                <div className="text-[36px] mb-3.5">{f.icon}</div>
                <h3 className="text-[16px] font-bold text-brand mb-2.5 mt-0">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed m-0">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DOCUMENTS ── */}
      <section className="py-[72px] px-6 bg-cream">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
            <div>
              <h2 className="text-[26px] font-bold text-brand mb-1 mt-0">Documents disponibles</h2>
              <p className="text-sm text-gray-500 m-0">Sélectionnez un modèle pour commencer</p>
            </div>
            <Link
              href="/documents"
              className="px-5 py-[9px] bg-gray-200 text-brand no-underline rounded-md text-sm font-semibold border border-gray-300 hover:bg-gray-300 transition-colors">
              Voir tout →
            </Link>
          </div>

          {loading && (
            <div className="text-center py-10 text-gray-500">⏳ Chargement...</div>
          )}

          {!loading && templates.length === 0 && (
            <div className="text-center py-[60px] text-gray-400">
              <p className="text-[48px] mb-3">📭</p>
              <p className="text-[15px]">Aucun modèle disponible pour le moment.</p>
            </div>
          )}

          <div className="flex flex-row flex-wrap gap-5">
            {templates.slice(0, 6).map((t, i) => (
              <div
                key={t.id}
                className="tpl-card bg-white rounded-[10px] py-4 px-5 shadow-sm border border-gray-200 flex-[1_1_340px] flex items-center gap-4 transition-[transform,box-shadow] duration-[220ms]"
                style={{ animation: `cardIn 0.5s cubic-bezier(0.16,1,0.3,1) ${0.05 * i}s both` }}>
                <div className="w-12 h-12 rounded-[10px] shrink-0 bg-mint flex items-center justify-center text-[24px]">📋</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-bold text-brand m-0 mb-[3px] truncate">{t.name}</h3>
                  <p className="text-[11px] text-gray-400 m-0">
                    {t.blanksCount} champ{t.blanksCount > 1 ? 's' : ''} · {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <Link
                  href={`/fill/${t.id}`}
                  className="shrink-0 px-[18px] py-2 bg-brand text-white no-underline rounded-md text-[13px] font-semibold whitespace-nowrap hover:bg-brand-dark transition-colors">
                  ✏️ Remplir
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white border-t border-gray-200 py-20 px-6">
        <div className="max-w-[720px] mx-auto">
          <h2 className="text-center text-[28px] font-bold text-brand mb-3 mt-0">
            Questions fréquentes
          </h2>
          <p className="text-center text-gray-500 text-[15px] mt-0 mb-10">
            Tout ce que vous devez savoir pour commencer
          </p>
          <div className="flex flex-col gap-3">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className={`faq-item border border-gray-200 rounded-[10px] overflow-hidden transition-colors duration-[180ms] ${openFaq === i ? 'bg-[#f0faf9]' : 'bg-white'}`}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-[18px] bg-transparent border-none cursor-pointer flex justify-between items-center text-[15px] font-semibold text-brand">
                  {item.q}
                  <span
                    className="text-brand text-[22px] font-light ml-3 leading-none inline-block transition-transform duration-200"
                    style={{ transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)' }}>
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-[18px] text-sm text-gray-500 leading-7">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-navy text-white/55 text-center py-8 px-6 text-[13px]">
        <div className="mb-2 text-white font-bold text-[16px]">📄 DocGen</div>
        <p className="m-0">Générateur de documents juridiques · {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
