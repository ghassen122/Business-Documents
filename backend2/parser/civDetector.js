/**
 * civDetector.js
 * Scans parsed blocks for occurrences of civility words
 * (Monsieur, Madame, M., Mme, Dr, Me, …) and replaces them
 * with {{CIV_N}} tokens, exactly like blankDetector does for blanks.
 *
 * Returns:
 *   civs:          Array<{ id, match, contextBefore, contextAfter }>
 *   patchedBlocks: deep-cloned blocks with tokens inserted
 */

// Ordered longest-first so "Monsieur" is matched before "M."
const CIV_PATTERN = /\b(Monsieur|Madame|Mme\.?|M\.|Dr\.?|Me\.?)\b/g;

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

function detectCivs(blocks) {
  const civs = [];
  let idCounter = 0;

  const patched = JSON.parse(JSON.stringify(blocks));

  function scanParagraph(para) {
    if (!para.runs) return;
    for (let ri = 0; ri < para.runs.length; ri++) {
      const run = para.runs[ri];
      if (!run.text) continue;

      // Collect all matches in this run
      const hits = [];
      CIV_PATTERN.lastIndex = 0;
      let m;
      while ((m = CIV_PATTERN.exec(run.text)) !== null) {
        hits.push({ start: m.index, end: m.index + m[0].length, match: m[0] });
      }
      if (!hits.length) continue;

      // Replace in reverse so indices stay valid
      for (let hi = hits.length - 1; hi >= 0; hi--) {
        const { start, end } = hits[hi];
        const civId = idCounter + hi;
        run.text = run.text.slice(0, start) + `{{CIV_${civId}}}` + run.text.slice(end);
      }

      // Push civs in forward order
      const ctx = getContext(para.runs, ri, 30);
      for (let hi = 0; hi < hits.length; hi++) {
        civs.push({
          id:            idCounter + hi,
          match:         hits[hi].match,
          contextBefore: ctx.contextBefore,
          contextAfter:  ctx.contextAfter,
          // intervenantIndex: assigned by admin, default null
          intervenantIndex: null,
        });
      }
      idCounter += hits.length;
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
  return { civs, patchedBlocks: patched };
}

module.exports = { detectCivs };
