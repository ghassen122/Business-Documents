'use strict';

const path    = require('path');
const pdfMake = require('pdfmake');
const PDFDocument =require ('pdfkit');

// ── Fonts ────────────────────────────────────────────────────────────────────
const ROBOTO = p => path.join(__dirname, '..', 'node_modules', 'pdfmake', 'build', 'fonts', 'Roboto', p);
const WIN    = p => `C:\\Windows\\Fonts\\${p}`;

pdfMake.fonts = {
  Roboto: {
    normal:      ROBOTO('Roboto-Regular.ttf'),
    bold:        ROBOTO('Roboto-Medium.ttf'),
    italics:     ROBOTO('Roboto-Italic.ttf'),
    bolditalics: ROBOTO('Roboto-MediumItalic.ttf'),
  },
  TimesNewRoman: {
    normal:      WIN('times.ttf'),
    bold:        WIN('timesbd.ttf'),
    italics:     WIN('timesi.ttf'),
    bolditalics: WIN('timesbi.ttf'),
  },
  Calibri: {
    normal:      WIN('calibri.ttf'),
    bold:        WIN('calibrib.ttf'),
    italics:     WIN('calibrii.ttf'),
    bolditalics: WIN('calibriz.ttf'),
  },
  Arial: {
    normal:      WIN('arial.ttf'),
    bold:        WIN('arialbd.ttf'),
    italics:     WIN('ariali.ttf'),
    bolditalics: WIN('arialbi.ttf'),
  },
  CourierNew: {
    normal:      WIN('cour.ttf'),
    bold:        WIN('courbd.ttf'),
    italics:     WIN('couri.ttf'),
    bolditalics: WIN('courbi.ttf'),
  },
};

// Map DOCX font names -> pdfmake font keys (case-insensitive)
const FONT_MAP = {
  'times new roman': 'TimesNewRoman',
  'times':           'TimesNewRoman',
  'calibri':         'Calibri',
  'calibri light':   'Calibri',
  'arial':           'Arial',
  'courier new':     'CourierNew',
  'courier':         'CourierNew',
  'roboto':          'Roboto',
};

function resolveFontName(rawFont) {
  if (!rawFont) return null;
  return FONT_MAP[rawFont.toLowerCase()] || null;
}

// ── Unit conversion ──────────────────────────────────────────────────────────
// Layout/spacing/indent stored in PIXELS (DocRenderer uses them as "${x}px").
// pdfmake works in points. 1px = 0.75pt  (96dpi -> 72pt/in)
const pxToPt = v => (Number(v) || 0) * 0.75;

// ── Alignment map ────────────────────────────────────────────────────────────
const alignMap = {
  center: 'center',
  right:  'right',
  both:   'justify',
  end:    'right',
  start:  'left',
  left:   'left',
};

// ── Token replacement ──────────────────────────────────────────────────────── into parts: static text vs filled blank values.
// Returns [{ text, isFilledBlank }]
function splitRunParts(text, blanks, values) {
  if (!text || !blanks || blanks.length === 0) return [{ text: text || '', isFilledBlank: false }];

  let parts = [{ text, isFilledBlank: false }];

  for (const blank of blanks) {
    const token = `{{BLANK_${blank.id}}}`;
    const val   = values?.[String(blank.id)] ?? '';
    const next  = [];
    for (const part of parts) {
      if (part.isFilledBlank) { next.push(part); continue; }
      const segments = part.text.split(token);
      if (segments.length === 1) { next.push(part); continue; }
      for (let i = 0; i < segments.length; i++) {
        if (segments[i] !== '') next.push({ text: segments[i], isFilledBlank: false });
        if (i < segments.length - 1) next.push({ text: val, isFilledBlank: true });
      }
    }
    parts = next;
  }

  return parts;
}

// ── Run builder ──────────────────────────────────────────────────────────────
// Returns an array of pdfmake inline objects (one per text part).
// Blank-filled parts get bold/italic stripped, matching the DocRenderer behaviour.
function buildRun(run, blanks, values) {
  if (run.isPageBreak) return [{ text: '', pageBreak: 'before' }];
  if (run.isBreak)     return [{ text: '\n' }];

  // Decoration shared by all parts of this run
  let decoration = null;
  if (run.underline && run.strike)  decoration = ['underline', 'lineThrough'];
  else if (run.underline)           decoration = 'underline';
  else if (run.strike)              decoration = 'lineThrough';

  const fontKey  = resolveFontName(run.font);

  const applyStyle = (obj, stripBoldItalic) => {
    if (!stripBoldItalic) {
      if (run.bold)   obj.bold    = true;
      if (run.italic) obj.italics = true;
    }
    if (run.fontSize) obj.fontSize = run.fontSize;
    if (run.color && run.color !== '000000') obj.color = '#' + run.color;
    if (fontKey)      obj.font    = fontKey;
    if (decoration)   obj.decoration = decoration;
    return obj;
  };

  const parts = splitRunParts(run.text || '', blanks, values);
  return parts.map(p => applyStyle({ text: p.text }, p.isFilledBlank));
}

// ── Paragraph builder ────────────────────────────────────────────────────────
function buildParagraph(block, blanks, values) {
  // buildRun now returns an array of inline objects — flatten all runs
  const runs = (block.runs || []).flatMap(r => buildRun(r, blanks, values));
  const pPr  = block.pPr || {};

  const mTop    = pxToPt(pPr.spacing?.before);
  const mBottom = pxToPt(pPr.spacing?.after);

  // ── List item: render as columns [label | content] ──────────────────────
  if (block.listLabel != null && block.listLabel !== '') {
    const indent  = block.listIndent || pPr.indent || {};
    const indLeft = pxToPt(indent.left || 0);
    const hanging = pxToPt(Math.abs(indent.firstLine || 0));

    const para = {
      columns: [
        { text: block.listLabel, width: hanging || 10 },
        { text: runs.length > 0 ? runs : [{ text: '' }] },
      ],
      columnGap: 2,
      margin: [indLeft - (hanging || 10), mTop, 0, mBottom],
    };
    if (block.pageBreakBefore) para.pageBreak = 'before';
    return para;
  }

  // ── Regular paragraph ────────────────────────────────────────────────────
  const para = { text: runs.length > 0 ? runs : [{ text: '' }] };

  // Page break — only from pageBreakBefore (w:lastRenderedPageBreak / explicit w:br)
  // sectionBreak blocks are skipped entirely before reaching here.
  if (block.pageBreakBefore) para.pageBreak = 'before';

  if (pPr.align && alignMap[pPr.align]) {
    para.alignment = alignMap[pPr.align];
  }

  const mLeft = pxToPt(pPr.indent?.left);
  if (mLeft || mTop || mBottom) {
    para.margin = [mLeft, mTop, 0, mBottom];
  }

  if (pPr.spacing?.line && pPr.spacing?.lineRule === 'auto') {
    const lh = pPr.spacing.line / 240;
    if (lh !== 1) para.lineHeight = lh;
  }

  return para;
}

// ── Table builder ────────────────────────────────────────────────────────────
function buildCellContent(blocks, blanks, values) {
  if (!blocks || blocks.length === 0) return [{ text: '' }];
  return blocks.map(b => {
    if (b.type === 'paragraph') return buildParagraph(b, blanks, values);
    if (b.type === 'table')     return buildTable(b, blanks, values);
    return { text: '' };
  });
}

function buildTable(block, blanks, values) {
  const body = (block.rows || []).map(row =>
    (row.cells || []).map(cell => ({
      stack: buildCellContent(cell.blocks, blanks, values),
    }))
  );

  const widths = (block.colWidths || []).length > 0
    ? block.colWidths.map(w => pxToPt(w))
    : (body[0] || []).map(() => '*');

  return {
    table: { widths, body: body.length > 0 ? body : [[{ text: '' }]] },
    layout: 'lightHorizontalLines',
  };
}

// ── Main export ──────────────────────────────────────────────────────────────
function generatePdf(template, values) {
  const layout = template.layout || {};
  const blanks = template.blanks || [];

  const pageWidth    = pxToPt(layout.pageWidth)    || 595.28;
  const pageHeight   = pxToPt(layout.pageHeight)   || 841.89;
  const marginLeft   = pxToPt(layout.marginLeft)   || 56.69;
  const marginTop    = pxToPt(layout.marginTop)    || 56.69;
  const marginRight  = pxToPt(layout.marginRight)  || 56.69;
  const marginBottom = pxToPt(layout.marginBottom) || 56.69;

  let defaultFont     = 'TimesNewRoman';
  let defaultFontSize = 12;
  outer: for (const block of (template.blocks || [])) {
    for (const run of (block.runs || [])) {
      const k = resolveFontName(run.font);
      if (k && defaultFont === 'TimesNewRoman') defaultFont = k;
      if (run.fontSize && defaultFontSize === 12) defaultFontSize = run.fontSize;
      if (defaultFont !== 'TimesNewRoman' && defaultFontSize !== 12) break outer;
    }
  }

  // Build content — skip structural sectionBreak paragraphs (they are empty
  // DOCX markers; the following block already carries pageBreakBefore=true).
  let prevWasSectionBreak = false;
  const content = [];
  for (const block of (template.blocks || [])) {
    // Skip the empty nextPage/evenPage/oddPage section-break paragraph
    if (block.sectionBreak && block.sectionBreak !== 'continuous') {
      prevWasSectionBreak = true;
      continue;
    }

    let built;
    if (block.type === 'paragraph') built = buildParagraph(block, blanks, values);
    else if (block.type === 'table') built = buildTable(block, blanks, values);
    else built = { text: '' };

    // If a sectionBreak was skipped just above, the current block already has
    // pageBreak:'before' from pageBreakBefore=true — no double break needed.
    prevWasSectionBreak = false;
    content.push(built);
  }

  const docDefinition = {
    pageSize:     { width: pageWidth, height: pageHeight },
    pageMargins:  [marginLeft, marginTop, marginRight, marginBottom + 20],
    defaultStyle: { font: defaultFont, fontSize: defaultFontSize },
    content,
    footer: (currentPage, pageCount) => ({
      text: `${currentPage} / ${pageCount}`,
      alignment: 'center',
      fontSize: 9,
      color: '#888888',
      margin: [0, 6, 0, 0],
    }),
  };

  pdfMake.setUrlAccessPolicy(() => false);
  return pdfMake.createPdf(docDefinition).getBuffer();
}


 const generateInvoicePdf = (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      const fs   = require('fs');
      const path = require('path');

      const LOGO_PATH = path.join(__dirname, '..', 'images', 'LogoDOCGEN.png');

      // ── Brand colours ──────────────────────────────────────────────
      const DARK_GREEN  = '#1a5450';   // bandeau header / titres
      const MID_GREEN   = '#2d8a83';   // accents ligne tableau
      const GOLD        = '#b8962e';   // numéro de facture highlight
      const TEXT_DARK   = '#1a1208';
      const TEXT_LIGHT  = '#ffffff';
      const BG_ROW      = '#f4f9f8';   // fond ligne alternée
      const BORDER      = '#d1ece9';

      const PAGE_W = 595.28;   // A4 pts
      const PAGE_H = 841.89;
      const MARGIN = 50;
      const INNER  = PAGE_W - MARGIN * 2;

      const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
      const buffers = [];
      doc.on('data', b => buffers.push(b));
      doc.on('end',  () => resolve(Buffer.concat(buffers)));

      // ── helper ─────────────────────────────────────────────────────
      const fmt = (n) => Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';
      const dateStr = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

      // ══════════════════════════════════════════════════════════════
      // HEADER BAND — dark green background
      // ══════════════════════════════════════════════════════════════
      doc.rect(0, 0, PAGE_W, 100).fill(DARK_GREEN);

      // Logo (top-right inside band)
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, PAGE_W - MARGIN - 130, 18, { width: 130 });
      }

      // "FACTURE" label (top-left inside band)
      doc.fillColor(TEXT_LIGHT)
         .font('Helvetica-Bold')
         .fontSize(26)
         .text('FACTURE', MARGIN, 28, { lineBreak: false });

      // Invoice number under title
      doc.fillColor(GOLD)
         .font('Helvetica-Bold')
         .fontSize(11)
         .text(`N° ${invoice.invoiceId || invoice._id}`, MARGIN, 62, { lineBreak: false });

      doc.y = 120;

      // ══════════════════════════════════════════════════════════════
      // META INFO ROW — two columns
      // ══════════════════════════════════════════════════════════════
      const col1x = MARGIN;
      const col2x = MARGIN + INNER / 2 + 20;
      const metaY = doc.y;

      // Left: client block
      doc.fillColor(MID_GREEN)
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('FACTURÉ À', col1x, metaY);

      doc.fillColor(TEXT_DARK)
         .font('Helvetica')
         .fontSize(10)
         .text(invoice.mail || invoice.email || '—', col1x, metaY + 14);

      // Right: invoice details block
      const labelX = col2x;
      const valueX = col2x + 120;
      let ry = metaY;

      const metaRow = (label, value, bold = false) => {
        doc.fillColor('#6b7260').font('Helvetica').fontSize(9).text(label, labelX, ry, { lineBreak: false });
        doc.fillColor(TEXT_DARK).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
           .text(value, valueX, ry, { lineBreak: false });
        ry += 16;
      };

      metaRow('Facture N° :', invoice.invoiceId || '—', true);
      metaRow('Date :',        dateStr(invoice.createdAt));
      metaRow('Order ID :',    String(invoice.orderId || '—'));
      metaRow('Statut :',      invoice.status || '—');

      doc.y = Math.max(doc.y, ry) + 28;

      // ══════════════════════════════════════════════════════════════
      // SEPARATOR LINE
      // ══════════════════════════════════════════════════════════════
      doc.moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
         .strokeColor(MID_GREEN).lineWidth(1.5).stroke();

      doc.y += 20;

      // ══════════════════════════════════════════════════════════════
      // TABLE HEADER
      // ══════════════════════════════════════════════════════════════
      const tableTop = doc.y;
      const colDesc  = MARGIN;
      const colMont  = PAGE_W - MARGIN - 100;
      const colMontW = 100;
      const rowH     = 26;

      // Header bg
      doc.rect(MARGIN, tableTop, INNER, rowH).fill(DARK_GREEN);

      doc.fillColor(TEXT_LIGHT)
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('DESCRIPTION', colDesc + 8, tableTop + 8, { lineBreak: false });

      doc.fillColor(TEXT_LIGHT)
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('MONTANT (€)', colMont, tableTop + 8, { lineBreak: false, width: colMontW, align: 'right' });

      // ── Single data row ──────────────────────────────────────────
      const rowY = tableTop + rowH;
      doc.rect(MARGIN, rowY, INNER, rowH).fill(BG_ROW);

      doc.fillColor(TEXT_DARK)
         .font('Helvetica')
         .fontSize(10)
         .text(
           (invoice.templateName || 'Document juridique'),
           colDesc + 8, rowY + 7, { lineBreak: false, width: colMont - colDesc - 16 }
         );

      doc.fillColor(TEXT_DARK)
         .font('Helvetica-Bold')
         .fontSize(10)
         .text(
           fmt(invoice.amount),
           colMont, rowY + 7, { lineBreak: false, width: colMontW, align: 'right' }
         );

      // ── Bottom border under row ────────────────────────────────
      doc.moveTo(MARGIN, rowY + rowH)
         .lineTo(PAGE_W - MARGIN, rowY + rowH)
         .strokeColor(BORDER).lineWidth(1).stroke();

      doc.y = rowY + rowH + 12;

      // ══════════════════════════════════════════════════════════════
      // TOTAL BOX (right-aligned)
      // ══════════════════════════════════════════════════════════════
      const totalBoxX = PAGE_W - MARGIN - 220;
      const totalBoxW = 220;
      const totalBoxY = doc.y;
      const totalBoxH = 36;

      doc.rect(totalBoxX, totalBoxY, totalBoxW, totalBoxH).fill(DARK_GREEN);

      doc.fillColor(TEXT_LIGHT)
         .font('Helvetica-Bold')
         .fontSize(11)
         .text('TOTAL À PAYER :', totalBoxX + 12, totalBoxY + 10, { lineBreak: false });

      doc.fillColor(GOLD)
         .font('Helvetica-Bold')
         .fontSize(13)
         .text(fmt(invoice.amount), totalBoxX, totalBoxY + 9,
               { lineBreak: false, width: totalBoxW - 12, align: 'right' });

      doc.y = totalBoxY + totalBoxH + 30;

      // ══════════════════════════════════════════════════════════════
      // THANK-YOU LINE
      // ══════════════════════════════════════════════════════════════
      doc.moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
         .strokeColor(BORDER).lineWidth(1).stroke();

      doc.y += 14;
      doc.fillColor(MID_GREEN)
         .font('Helvetica-BoldOblique')
         .fontSize(10)
         .text('Merci pour votre confiance.', MARGIN, doc.y, { align: 'center', width: INNER });

      // ══════════════════════════════════════════════════════════════
      // FOOTER — pinned to bottom
      // ══════════════════════════════════════════════════════════════
      doc.rect(0, PAGE_H - 36, PAGE_W, 36).fill(DARK_GREEN);
      doc.fillColor(TEXT_LIGHT)
         .font('Helvetica')
         .fontSize(8)
         .text(
           'DocGen — Document · Juridique  |  contact@docgen.fr  |  www.docgen.fr',
           MARGIN, PAGE_H - 22,
           { align: 'center', width: INNER, lineBreak: false }
         );

      doc.end();

    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generatePdf, generateInvoicePdf };
