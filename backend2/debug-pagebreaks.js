/**
 * debug-pagebreaks.js
 * Fetches the template "Contrat Pro" from DB, shows raw XML around page breaks
 * and the parsed blocks that should carry pageBreakBefore/sectionBreak.
 * Usage: node debug-pagebreaks.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const JSZip    = require('jszip');
const { XMLParser } = require('fast-xml-parser');
const Template = require('./models/Template');

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: false,
  trimValues: false,
  textNodeName: '#text',
  parseTagValue: false,
});

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');

  // Find template with "contrat" or "pro" in name (case insensitive)
  const templates = await Template.find({}, 'name fileName originalDocx blanks').lean();
  console.log('Templates disponibles:');
  templates.forEach(t => console.log(' -', t.name, '|', t.fileName, '| id:', t._id));

  const template = templates.find(t =>
    (t.name || '').toLowerCase().includes('contrat') ||
    (t.name || '').toLowerCase().includes('pro') ||
    (t.fileName || '').toLowerCase().includes('contrat')
  );

  if (!template) { console.log('\nAucun template "contrat/pro" trouvé.'); process.exit(0); }
  console.log('\n→ Analyse:', template.name);

  if (!template.originalDocx) { console.log('Pas de originalDocx.'); process.exit(0); }

  const buffer = Buffer.from(template.originalDocx, 'base64');
  const zip    = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml').async('string');

  // ── 1. Raw XML: find all page-break related elements ──────────────────────
  console.log('\n═══ RAW XML — éléments liés aux sauts de page ═══\n');

  // Find w:br type=page
  const brMatches = [...docXml.matchAll(/<w:br[^>]*>/g)];
  console.log(`w:br found: ${brMatches.length}`);
  brMatches.forEach(m => {
    const start = Math.max(0, m.index - 100);
    const end   = Math.min(docXml.length, m.index + 200);
    console.log('  ---');
    console.log(docXml.slice(start, end).replace(/\s+/g, ' '));
  });

  // Find w:pageBreakBefore
  const pbMatches = [...docXml.matchAll(/<w:pageBreakBefore[^/]*\/?>|<w:pageBreakBefore[^>]*>.*?<\/w:pageBreakBefore>/g)];
  console.log(`\nw:pageBreakBefore found: ${pbMatches.length}`);
  pbMatches.forEach(m => {
    const start = Math.max(0, m.index - 200);
    const end   = Math.min(docXml.length, m.index + 100);
    console.log('  ---');
    console.log(docXml.slice(start, end).replace(/\s+/g, ' '));
  });

  // Find w:lastRenderedPageBreak
  const lrpbMatches = [...docXml.matchAll(/<w:lastRenderedPageBreak\s*\/>/g)];
  console.log(`\nw:lastRenderedPageBreak found: ${lrpbMatches.length}`);
  lrpbMatches.forEach(m => {
    const start = Math.max(0, m.index - 150);
    const end   = Math.min(docXml.length, m.index + 300);
    console.log('  ---');
    console.log(docXml.slice(start, end).replace(/\s+/g, ' '));
  });

  // Find w:sectPr
  const sectMatches = [...docXml.matchAll(/<w:sectPr[\s>]/g)];
  console.log(`\nw:sectPr found: ${sectMatches.length}`);
  sectMatches.forEach(m => {
    const start = Math.max(0, m.index - 50);
    const end   = Math.min(docXml.length, m.index + 300);
    console.log('  ---');
    console.log(docXml.slice(start, end).replace(/\s+/g, ' '));
  });

  // ── 2. Parsed blocks: show those with pageBreakBefore or sectionBreak ─────
  const { parseDocx }   = require('./parser/docxParser');
  const { detectBlanks } = require('./parser/blankDetector');
  const { layout, blocks } = await parseDocx(buffer);
  const { blanks, patchedBlocks } = detectBlanks(blocks);

  console.log('\n═══ PARSED BLOCKS — sauts de page détectés ═══\n');
  console.log(`Total blocks: ${patchedBlocks.length}`);
  patchedBlocks.forEach((b, i) => {
    if (b.pageBreakBefore || b.sectionBreak) {
      const text = (b.runs || []).map(r => r.text || '').join('').slice(0, 60);
      console.log(`  Block[${i}] pageBreakBefore=${b.pageBreakBefore} sectionBreak=${b.sectionBreak} text="${text}"`);
    }
  });

  const total = patchedBlocks.filter(b => b.pageBreakBefore || b.sectionBreak).length;
  console.log(`\n→ Blocs avec saut de page: ${total}`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
