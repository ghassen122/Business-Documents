/**
 * docxParser.js
 * Main entry: accepts a Buffer of a .docx file, returns structured JSON.
 */

const JSZip  = require('jszip');
const { XMLParser } = require('fast-xml-parser');
const { parseStylesXml, resolveStyle } = require('./stylesParser');
const { parseNumberingXml }            = require('./numberingParser');
const { parseDocumentXml }             = require('./documentParser');

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: false,
  trimValues: false,
  // preserve whitespace in text nodes
  textNodeName: '#text',
  parseTagValue: false,
  // no array coercion — we handle it manually
});

async function parseDocx(buffer) {
  const zip = await JSZip.loadAsync(buffer);

  // ---- Read XML parts ----
  const readXml = async (path) => {
    const file = zip.file(path);
    if (!file) return null;
    const str = await file.async('string');
    return xmlParser.parse(str);
  };

  const [docParsed, stylesParsed, numberingParsed, relsParsed] = await Promise.all([
    readXml('word/document.xml'),
    readXml('word/styles.xml'),
    readXml('word/numbering.xml'),
    readXml('word/_rels/document.xml.rels'),
  ]);

  // ---- Styles ----
  const rawStyles = stylesParsed ? parseStylesXml(stylesParsed) : {};

  // Build resolved styles map (cache all)
  const resolvedStylesMap = {};
  for (const id of Object.keys(rawStyles)) {
    resolvedStylesMap[id] = resolveStyle(id, rawStyles, resolvedStylesMap);
  }

  // ---- Numbering ----
  const numMap = numberingParsed ? parseNumberingXml(numberingParsed) : {};

  // ---- Document blocks ----
  const blocks = docParsed ? parseDocumentXml(docParsed, rawStyles, numMap) : [];

  // ---- Page layout from sectPr ----
  const sectPr = docParsed?.['w:document']?.['w:body']?.['w:sectPr'] || {};
  const pgSz   = sectPr['w:pgSz'] || {};
  const pgMar  = sectPr['w:pgMar'] || {};
  const TWIPS  = 15; // twips → px (1440/96)
  const layout = {
    pageWidth:     Math.round(Number(pgSz['@_w:w']     || 12240) / TWIPS),
    pageHeight:    Math.round(Number(pgSz['@_w:h']     || 15840) / TWIPS),
    marginTop:     Math.round(Number(pgMar['@_w:top']  || 1440)  / TWIPS),
    marginBottom:  Math.round(Number(pgMar['@_w:bottom']|| 1440) / TWIPS),
    marginLeft:    Math.round(Number(pgMar['@_w:left'] || 1800)  / TWIPS),
    marginRight:   Math.round(Number(pgMar['@_w:right']|| 1800)  / TWIPS),
  };

  // ---- Hyperlink relationships ----
  const hyperlinks = {};
  let rels = relsParsed?.['Relationships']?.['Relationship'];
  if (rels) {
    if (!Array.isArray(rels)) rels = [rels];
    for (const r of rels) {
      if (r['@_Type']?.endsWith('/hyperlink')) {
        hyperlinks[r['@_Id']] = r['@_Target'];
      }
    }
  }

  return { layout, blocks, hyperlinks };
}

module.exports = { parseDocx };
