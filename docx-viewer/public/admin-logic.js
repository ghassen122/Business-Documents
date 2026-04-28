/**
 * admin-logic.js — Browser logic for /admin page.
 *
 * Mirrors admin.js (Next.js) behaviour:
 *  - Import DOCX → POST /api/parse-admin → get blanks + parsed doc
 *  - Show blanks in left panel, let admin name each one
 *  - Show document preview in right panel (blanks highlighted in yellow)
 *  - Publish → POST /api/templates
 *  - List / Delete templates via overlay
 *
 * NOTE: renderer.js is loaded before this file and provides the global
 *       rendering functions: renderParagraph, renderTable, renderDocumentInto, etc.
 *       We do NOT re-declare any const that renderer.js already declared.
 */

// ─── DOM refs (admin-specific — no overlap with renderer.js) ─────────────────
const _a_fileInput        = document.getElementById('fileInput');
const _a_fileNameDisplay  = document.getElementById('fileNameDisplay');
const _a_loadingBar       = document.getElementById('loadingBar');
const _a_templateNameEl   = document.getElementById('templateName');
const _a_blanksList       = document.getElementById('blanksList');
const _a_emptyMsg         = document.getElementById('emptyMsg');
const _a_btnPublish       = document.getElementById('btnPublish');
const _a_publishStatus    = document.getElementById('publishStatus');
const _a_btnListTemplates = document.getElementById('btnListTemplates');
const _a_templatesOverlay = document.getElementById('templatesOverlay');
const _a_templatesList    = document.getElementById('templatesList');
const _a_btnCloseOverlay  = document.getElementById('btnCloseOverlay');
const _a_docPage          = document.getElementById('docPage');
const _a_docContent       = document.getElementById('docContent');

// ─── State ───────────────────────────────────────────────────────────────────
let _a_currentData = null;   // { layout, blocks, hyperlinks, blanks }
let _a_blankNames  = {};     // { blankId: fieldName }

// Shorthand aliases for readability inside this file
const fileNameDisplay  = _a_fileNameDisplay;
const loadingBar       = _a_loadingBar;
const templateNameEl   = _a_templateNameEl;
const blanksList       = _a_blanksList;
const emptyMsg         = _a_emptyMsg;
const btnPublish       = _a_btnPublish;
const publishStatus    = _a_publishStatus;
const btnListTemplates = _a_btnListTemplates;
const templatesOverlay = _a_templatesOverlay;
const templatesList    = _a_templatesList;
const btnCloseOverlay  = _a_btnCloseOverlay;
const docPageEl        = _a_docPage;
const docContentEl     = _a_docContent;

// ─── File import ─────────────────────────────────────────────────────────────
_a_fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  await importDocx(file);
});

async function importDocx(file) {
  fileNameDisplay.textContent = file.name;
  // Auto-fill template name from filename
  if (!templateNameEl.value.trim()) {
    templateNameEl.value = file.name.replace(/\.docx$/i, '').replace(/[-_]/g, ' ');
  }

  loadingBar.classList.remove('hidden');
  resetState();

  try {
    const fd = new FormData();
    fd.append('docx', file);
    const res = await fetch('/api/parse-admin', { method: 'POST', body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    _a_currentData = await res.json();
    renderBlanks(_a_currentData.blanks);
    renderPreview(_a_currentData);
    if (_a_currentData.blanks.length > 0) {
      btnPublish.disabled = false;
    } else {
      // No blanks: still allow publishing (doc with no fields)
      btnPublish.disabled = !templateNameEl.value.trim();
    }
  } catch (err) {
    showStatus(`Erreur : ${err.message}`, 'err');
    docContentEl.innerHTML = `<p style="color:red;padding:20px">Erreur de parsing : ${err.message}</p>`;
  } finally {
    loadingBar.classList.add('hidden');
  }
}

function resetState() {
  _a_currentData = null;
  _a_blankNames  = {};
  blanksList.innerHTML = '';
  emptyMsg.classList.remove('hidden');
  btnPublish.disabled = true;
  publishStatus.classList.add('hidden');
  docContentEl.innerHTML = '<p class="preview-placeholder">La prévisualisation du document apparaîtra ici.</p>';
}

// ─── Render blank name cards (mirrors admin.js left panel) ────────────────────
function renderBlanks(blanks) {
  blanksList.innerHTML = '';
  if (!blanks || blanks.length === 0) {
    emptyMsg.textContent = _a_currentData ? 'Aucun champ vide détecté dans ce document.' : 'Importez un fichier DOCX pour commencer.';
    emptyMsg.classList.remove('hidden');
    return;
  }
  emptyMsg.classList.add('hidden');

  // Initialise names
  blanks.forEach(b => {
    _a_blankNames[b.id] = b.placeholder || `Champ ${b.id + 1}`;
  });

  blanks.forEach((blank) => {
    const card = document.createElement('div');
    card.className = 'blank-card';

    // Context line (same as admin.js: "...before [_____] after...")
    const ctx = document.createElement('div');
    ctx.className = 'blank-card-context';
    ctx.innerHTML =
      `…${escHtml(blank.contextBefore)}<span class="blank-token"> [_____] </span>${escHtml(blank.contextAfter)}…`;

    const lbl = document.createElement('label');
    lbl.className = 'blank-card-label';
    lbl.textContent = 'Nom du champ :';

    const inp = document.createElement('input');
    inp.type        = 'text';
    inp.className   = 'blank-card-input';
    inp.value       = _a_blankNames[blank.id];
    inp.placeholder = `Champ ${blank.id + 1}`;
    inp.addEventListener('input', () => {
      _a_blankNames[blank.id] = inp.value;
    });

    card.appendChild(ctx);
    card.appendChild(lbl);
    card.appendChild(inp);
    blanksList.appendChild(card);
  });
}

// ─── Render document preview ──────────────────────────────────────────────────
function renderPreview(data) {
  // Use the shared renderDocumentInto from renderer.js for identical output
  renderDocumentInto(data, docPageEl, docContentEl);
  // Then walk and highlight {{BLANK_N}} tokens in the rendered DOM
  highlightTokenSpans(docContentEl);
}

/**
 * Walk all text nodes in element and wrap {{BLANK_N}} with highlighted spans.
 */
function highlightTokenSpans(el) {
  const TOKEN_RE = /\{\{BLANK_\d+\}\}/g;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const replacements = [];
  let node;
  while ((node = walker.nextNode())) {
    if (TOKEN_RE.test(node.textContent)) {
      replacements.push(node);
      TOKEN_RE.lastIndex = 0;
    }
  }
  for (const textNode of replacements) {
    const fragment = document.createDocumentFragment();
    let last = 0;
    TOKEN_RE.lastIndex = 0;
    let m;
    const text = textNode.textContent;
    while ((m = TOKEN_RE.exec(text)) !== null) {
      if (m.index > last) fragment.appendChild(document.createTextNode(text.slice(last, m.index)));
      const token = m[0];
      // Extract id to get the field name
      const idMatch = token.match(/BLANK_(\d+)/);
      const bid = idMatch ? Number(idMatch[1]) : null;
      const label = (bid !== null && _a_blankNames[bid]) ? _a_blankNames[bid] : token;
      const span = document.createElement('span');
      span.className = 'blank-highlight';
      span.title = token;
      span.textContent = `[${label}]`;
      fragment.appendChild(span);
      last = m.index + token.length;
    }
    if (last < text.length) fragment.appendChild(document.createTextNode(text.slice(last)));
    textNode.replaceWith(fragment);
  }
}

// ─── Publish ─────────────────────────────────────────────────────────────────
templateNameEl.addEventListener('input', () => {
  if (_a_currentData) btnPublish.disabled = !templateNameEl.value.trim();
});

btnPublish.addEventListener('click', async () => {
  if (!_a_currentData) return;
  const name = templateNameEl.value.trim();
  if (!name) { showStatus('Veuillez donner un nom au modèle.', 'err'); return; }

  // Build final blanks with names
  const namedBlanks = (_a_currentData.blanks || []).map(b => ({
    ...b,
    name: (_a_blankNames[b.id] || '').trim() || `Champ ${b.id + 1}`,
  }));

  btnPublish.disabled = true;
  btnPublish.textContent = '⏳ Publication…';

  // Read original file as base64 so the fill endpoint can generate DOCX later
  let originalDocx = null;
  const origFile = _a_fileInput.files[0];
  if (origFile) {
    originalDocx = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(origFile);
    });
  }

  try {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        fileName: fileNameDisplay.textContent || '',
        layout:     _a_currentData.layout,
        blocks:     _a_currentData.blocks,
        hyperlinks: _a_currentData.hyperlinks,
        blanks:     namedBlanks,
        originalDocx,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    btnPublish.classList.add('success');
    btnPublish.textContent = '✅ Publié !';
    showStatus('✅ Modèle publié avec succès !', 'ok');
    // Reset after 2 s
    setTimeout(() => {
      btnPublish.classList.remove('success');
      btnPublish.textContent = '✅ Publier le modèle';
      btnPublish.disabled = false;
    }, 2500);
  } catch (err) {
    showStatus(`Erreur : ${err.message}`, 'err');
    btnPublish.textContent = '✅ Publier le modèle';
    btnPublish.disabled = false;
  }
});

// ─── Templates overlay ───────────────────────────────────────────────────────
btnListTemplates.addEventListener('click', async (e) => {
  e.preventDefault();
  await loadTemplatesOverlay();
  templatesOverlay.classList.remove('hidden');
});
btnCloseOverlay.addEventListener('click', () => templatesOverlay.classList.add('hidden'));
templatesOverlay.addEventListener('click', (e) => {
  if (e.target === templatesOverlay) templatesOverlay.classList.add('hidden');
});

async function loadTemplatesOverlay() {
  templatesList.innerHTML = '<p class="empty-msg">Chargement…</p>';
  try {
    const res = await fetch('/api/templates');
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) {
      templatesList.innerHTML = '<p class="empty-msg">Aucun modèle publié pour l\'instant.</p>';
      return;
    }
    templatesList.innerHTML = '';
    list.forEach(t => {
      const row = document.createElement('div');
      row.className = 'template-row';

      const info = document.createElement('div');
      info.className = 'template-info';
      info.innerHTML = `
        <div class="template-name">${escHtml(t.name)}</div>
        <div class="template-meta">${t.blanksCount} champ(s) · ${new Date(t.createdAt).toLocaleDateString('fr-FR')}</div>
      `;

      const del = document.createElement('button');
      del.className = 'btn-delete';
      del.textContent = '🗑 Supprimer';
      del.addEventListener('click', async () => {
        if (!confirm(`Supprimer "${t.name}" ?`)) return;
        await fetch(`/api/templates/${t.id}`, { method: 'DELETE' });
        await loadTemplatesOverlay();
      });

      row.appendChild(info);
      row.appendChild(del);
      templatesList.appendChild(row);
    });
  } catch (err) {
    templatesList.innerHTML = `<p style="color:red">Erreur : ${err.message}</p>`;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function showStatus(msg, type) {
  publishStatus.textContent = msg;
  publishStatus.className = `publish-status ${type}`;
  publishStatus.classList.remove('hidden');
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
