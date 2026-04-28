/**
 * blankDetector.js
 * Scans parsed blocks and detects "fill-in" blanks:
 *   — sequences of 3+ underscores  ___
 *   — [ ... ] with dots or underscores inside
 *   — sequences of dots ......
 *
 * Returns:
 *   blanks:       Array<{ id, marker, placeholder, contextBefore, contextAfter }>
 *   patchedBlocks: deep-cloned blocks where each blank text is replaced with {{BLANK_N}}
 */

// Patterns we recognize as fill-in blanks (order matters — longest first)
const BLANK_PATTERNS = [
  /_{3,}/g,          // _____ (3 or more underscores)
  /\.{4,}/g,         // ..... (4 or more dots)
  /\[_+\]/g,         // [___]
  /\[\.+\]/g,        // [...]
  /\[\s{2,}\]/g,     // [   ] (2+ spaces in brackets)
];

/**
 * Returns [{ start, end, marker }] for all blank occurrences in a text string.
 */
function findBlanksInText(text) {
  const found = [];
  for (const pat of BLANK_PATTERNS) {
    pat.lastIndex = 0;
    let m;
    while ((m = pat.exec(text)) !== null) {
      found.push({ start: m.index, end: m.index + m[0].length, marker: m[0] });
    }
  }
  // Sort and deduplicate overlapping ranges
  found.sort((a, b) => a.start - b.start);
  const deduped = [];
  for (const r of found) {
    if (deduped.length && r.start < deduped[deduped.length - 1].end) continue;
    deduped.push(r);
  }
  return deduped;
}

/**
 * Extract ~30 chars of surrounding text from a paragraph's runs, around a run index.
 */
function getContext(runs, runIndex, CHARS = 30) {
  let before = '';
  let after  = '';
  for (let i = runIndex - 1; i >= 0 && before.length < CHARS; i--) {
    before = (runs[i].text || '') + before;
  }
  for (let i = runIndex + 1; i < runs.length && after.length < CHARS; i++) {
    after += (runs[i].text || '');
  }
  return {
    contextBefore: before.slice(-CHARS).trim(),
    contextAfter:  after.slice(0, CHARS).trim(),
  };
}

/**
 * Deep-scan all blocks (paragraphs + table cells), detect blanks and patch them.
 */
function detectBlanks(blocks) {
  const blanks = [];
  let idCounter = 0;

  // Deep clone so we don't mutate the original
  const patched = JSON.parse(JSON.stringify(blocks));

  function scanParagraph(para) {
    if (!para.runs) return;
    for (let ri = 0; ri < para.runs.length; ri++) {
      const run = para.runs[ri];
      if (!run.text) continue;
      const hits = findBlanksInText(run.text);
      if (!hits.length) continue;

      // Process hits in reverse so indices stay valid after replacement
      for (let hi = hits.length - 1; hi >= 0; hi--) {
        const { start, end, marker } = hits[hi];
        const blankId = idCounter++;
        const token   = `{{BLANK_${blankId}}}`;
        const ctx = getContext(para.runs, ri, 30);

        blanks.push({
          id:            blankId,
          marker,          // original text (e.g. "______")
          token,           // replacement token
          placeholder:   `Champ ${blankId + 1}`,
          name:          '',
          contextBefore: ctx.contextBefore,
          contextAfter:  ctx.contextAfter,
        });

        // Patch the run text
        run.text = run.text.slice(0, start) + token + run.text.slice(end);
      }
    }
  }

  function scanBlock(block) {
    if (block.type === 'paragraph') {
      scanParagraph(block);
    } else if (block.type === 'table') {
      for (const row of block.rows || []) {
        for (const cell of row.cells || []) {
          for (const b of cell.blocks || []) scanBlock(b);
        }
      }
    }
  }

  for (const block of patched) scanBlock(block);
  return { blanks, patchedBlocks: patched };
}

module.exports = { detectBlanks };
