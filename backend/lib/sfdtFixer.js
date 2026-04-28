/**
 * sfdtFixer.js
 * Post-processes a raw SFDT string to fix common formatting issues
 * introduced by the DOCX → SFDT conversion:
 *
 *  Fix 1 – Headings not centered
 *    Word encodes centered headings with surrounding \t characters and tab stops
 *    (visual trick). Syncfusion SFDT renders them as justified/indented instead
 *    of truly centered. We detect the pattern and apply real center alignment.
 *
 *  Fix 2 – List bullets missing / bad indentation
 *    "List Paragraph" blocks carry a list-item reference (lif) but the bullet
 *    character lives in the abstractLists definitions which are sometimes lost
 *    or ignored during DOCX→SFDT→DOCX round-trips. We insert the bullet
 *    character explicitly as an inline run so it always appears in the output.
 */

function fixSfdt(sfdtString) {
  // Skip if input is not a string
  if (typeof sfdtString !== 'string') return sfdtString

  let doc
  try {
    doc = JSON.parse(sfdtString)
  } catch (e) {
    return sfdtString // not valid JSON, return unchanged
  }

  if (!Array.isArray(doc.sec)) return sfdtString

  doc.sec.forEach(sec => {
    if (!Array.isArray(sec.b)) return

    sec.b.forEach(block => {
      const pf = block.pf
      if (!pf) return
      const stn  = pf.stn  || ''
      const inlines = block.i || []

      // ─────────────────────────────────────────────────────────────────────
      // Fix 1: Heading tab-based centering → true center alignment (ta = 1)
      //
      // Pattern: the block has \t inlines AND the paragraph is not already
      // centered. Word places one \t at the start and one at the end around
      // the heading text to fake centering via tab stops.
      // ─────────────────────────────────────────────────────────────────────
      const isHeading = /^Heading(\s|$)/i.test(stn)
      if (isHeading) {
        const hasTabs = inlines.some(item => item.tlp === '\t')
        // Only act when tabs are present AND alignment is not already center (1)
        if (hasTabs && pf.ta !== 1) {
          pf.ta = 1 // center
          // Remove all standalone tab inlines (keep text + space inlines)
          block.i = inlines.filter(item => item.tlp !== '\t')
          // Remove tab stops – they were only needed for the fake centering
          delete pf.tb
        }
      }

      // ─────────────────────────────────────────────────────────────────────
      // Fix 2: List Paragraph – add explicit bullet inline when missing
      //
      // The block has lif (list-item format) referencing a list/abstractList
      // definition. When the SFDT is exported back to DOCX the bullet char
      // may be lost. We inject a "•" run directly so it is always present.
      // ─────────────────────────────────────────────────────────────────────
      if (stn === 'List Paragraph' && pf.lif && inlines.length > 0) {
        // Find first visible (non-whitespace) text run
        const firstIdx = inlines.findIndex(
          item => typeof item.tlp === 'string' && item.tlp.trim().length > 0
        )
        if (firstIdx !== -1) {
          const firstText = inlines[firstIdx].tlp
          const bulletChars = ['•', '·', '–', '-', '*', '○', '◾', '▪', '→', '►']
          const alreadyHasBullet = bulletChars.some(b => firstText.startsWith(b))

          if (!alreadyHasBullet) {
            // Inherit character format from the first run (font, size, etc.)
            const cf = inlines[firstIdx].cf
              ? Object.assign({}, inlines[firstIdx].cf)
              : {}

            // Prepend "•\t" so the tab character produces the hanging indent gap
            block.i = [
              { tlp: '•', cf },
              { tlp: '\t', cf },
              ...inlines
            ]

            // Apply hanging indent so the text wraps under the text (not the bullet)
            // Syncfusion optimized SFDT uses 'lin' (leftIndent) and 'fin' (firstLineIndent)
            if (!pf.lin || pf.lin === 0) pf.lin = 18   // left indent ~0.25 in
            if (!pf.fin || pf.fin === 0) pf.fin = -18  // hanging first-line (negative = hanging)

            // Remove the lif reference to prevent duplicate bullets from the
            // list definition being applied on top of our explicit bullet
            delete pf.lif
          }
        }
      }
    })
  })

  return JSON.stringify(doc)
}

module.exports = { fixSfdt }
