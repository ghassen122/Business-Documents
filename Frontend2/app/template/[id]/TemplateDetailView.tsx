'use client'
import React from 'react'
import Link from 'next/link'
import Navbar from '../../(components)/Navbar'
import DocRenderer from '../../(components)/DocRenderer'
import type { DocumentTemplate } from '@/types/document'

interface Props {
  template: DocumentTemplate
}

export default function TemplateDetailView({ template }: Props) {
  const blanksCount = (template.blanks || []).length
  const isPaid = (template.price ?? 0) > 0

  // Keep only blocks up to (but not including) the first page break
  const allBlocks: any[] = template.blocks as any[] || []
  const firstBreak = allBlocks.findIndex(
    (b: any) => b.pageBreakBefore || (b.sectionBreak && b.sectionBreak !== 'continuous')
  )
  const firstPageBlocks = firstBreak > 0 ? allBlocks.slice(0, firstBreak) : allBlocks

  // Count total pages (1 + number of page-break blocks)
  const totalPages = 1 + allBlocks.filter(
    (b: any) => b.pageBreakBefore || (b.sectionBreak && b.sectionBreak !== 'continuous')
  ).length

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ background: '#f5f0e8' }}>
      <Navbar />

      {/* ── Two-column layout fills the rest of the viewport ── */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT — document preview */}
        <div
          className="w-[30%] shrink-0 mt-10"
          style={{ background: '#faf6ee' }}
        >
          {/* scrollable doc box, full height of left column */}
          <div className="overflow-y-auto overflow-x-hidden" style={{ height: 'calc(100vh - 64px)' }}>
            {/* wrapper sized to the document — overlays anchor here */}
            <div style={{ position: 'relative' }}>
              <div style={{ zoom: 0.62, transformOrigin: 'top left', width: 'fit-content', marginLeft: '20px' }}>
                <DocRenderer
                  data={{
                    layout:     template.layout,
                    blocks:     firstPageBlocks,
                    hyperlinks: template.hyperlinks,
                  }}
                  blanks={template.blanks}
                  values={{}}
                  civs={template.civs}
                  civValues={{}}
                />
              </div>

              {/* Permanent bottom fade + 2 blurred illegible lines */}
              <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: '38%' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 0%, rgba(250,246,238,0.85) 55%, #faf6ee 100%)' }} />
                <div style={{ position: 'absolute', bottom: '72px', left: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ height: '10px', borderRadius: '6px', background: 'rgba(90,75,60,0.13)', filter: 'blur(3px)' }} />
                  <div style={{ height: '10px', borderRadius: '6px', background: 'rgba(90,75,60,0.10)', filter: 'blur(3px)', width: '75%' }} />
                </div>
              </div>

              {/* Aperçu badge */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center" style={{ pointerEvents: 'none' }}>
                <span
                  className="text-[11px] font-semibold px-3 py-1 rounded-full"
                  style={{ background: 'rgba(26,84,80,0.10)', color: '#1a5450', border: '1px solid rgba(26,84,80,0.18)' }}
                >
                  Aperçu · page 1 sur {totalPages}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — title + meta + CTA + description */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ background: '#faf6ee' }}
        >
          <div className="max-w-[700px] px-12 py-10 flex flex-col gap-7">

            {/* breadcrumb */}
            <div className="text-[12px]" style={{ color: '#8a7d6b' }}>
              <Link href="/documents" className="no-underline hover:underline" style={{ color: '#8a7d6b' }}>
                Documents
              </Link>
              {' › '}{template.name}
            </div>

            {/* Document title */}
            <h1 className="m-0 text-[28px] font-extrabold leading-tight" style={{ color: '#1a1208' }}>
              {template.name}
            </h1>

            {/* Metadata row — horizontal like the image */}
            {(template.details?.revisionLabel || template.details?.formatsLabel || template.details?.pageLabel) && (
              <div className="flex gap-10 flex-wrap">
                {template.details?.revisionLabel && (
                  <div>
                    <div className="text-[12px] font-bold mb-1" style={{ color: '#1a1208' }}>Dernière révision</div>
                    <div className="text-[14px]" style={{ color: '#5c5040' }}>🕐 {template.details.revisionLabel}</div>
                  </div>
                )}
                {template.details?.formatsLabel && (
                  <div>
                    <div className="text-[12px] font-bold mb-1" style={{ color: '#1a1208' }}>Formats</div>
                    <div className="text-[14px]" style={{ color: '#5c5040' }}>🗎 {template.details.formatsLabel}</div>
                  </div>
                )}
                {template.details?.pageLabel && (
                  <div>
                    <div className="text-[12px] font-bold mb-1" style={{ color: '#1a1208' }}>Taille</div>
                    <div className="text-[14px]" style={{ color: '#5c5040' }}>↕ {template.details.pageLabel}</div>
                  </div>
                )}
              </div>
            )}

            {/* CTA button */}
            <div>
              <Link
                href={`/fill/${template.id}`}
                className="inline-block px-8 py-[13px] text-white no-underline rounded-full font-bold text-[15px] transition-[opacity,transform] duration-[180ms] hover:opacity-90 shadow-[0_4px_16px_rgba(26,84,80,0.35)]"
                style={{ background: 'linear-gradient(135deg, #1a5450 0%, #2d8a83 100%)' }}
              >
                {isPaid ? `💳 Remplir et payer — ${template.price} €` : 'Remplir le modèle'}
              </Link>
            </div>

            {/* Intro */}
            {template.details?.intro && (
              <p className="m-0 text-[14px] leading-relaxed" style={{ color: '#3b3120' }}>
                {template.details.intro}
              </p>
            )}

            {/* Description avec titres ## */}
            {template.details?.description && (
              <div>
                {template.details.description.split('\n\n').filter(Boolean).map((para, i) =>
                  para.trim().startsWith('##') ? (
                    <h2 key={i} className="text-[17px] font-extrabold mt-5 mb-2" style={{ color: '#1a1208' }}>
                      {para.trim().replace(/^##\s*/, '')}
                    </h2>
                  ) : (
                    <p key={i} className="text-[14px] leading-relaxed mb-3 mt-0" style={{ color: '#5c5040' }}>{para}</p>
                  )
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
