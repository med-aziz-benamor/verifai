// Owner: Extension Lead
// File: extension/popup/popup.js
// Description: Popup controller. Loads the current-page URL verdict from
//              chrome.storage, wires up tab switching, and handles manual
//              text/URL analysis forms by messaging the background service worker.

'use strict';

const API_BASE = 'http://localhost:8000';
// TODO: change to https://api.verifai.app for production

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function verdictColor(verdict = '') {
  if (verdict.includes('authentic') || verdict === 'safe') return '#34d399';
  if (verdict.includes('suspicious') || verdict.includes('manipulated')) return '#fbbf24';
  if (verdict.includes('ai_generated') || verdict.includes('dangerous')) return '#f87171';
  return '#94a3b8';
}

function riskBadgeClass(risk = '') {
  const map = { high: 'badge-high', medium: 'badge-medium', low: 'badge-low' };
  return map[risk] ?? 'badge-medium';
}

function buildResultHTML(result) {
  const color = verdictColor(result.verdict ?? '');
  const signalsHtml = (result.signals ?? [])
    .map((s) => `<li><span>⚠</span>${s}</li>`)
    .join('');

  const scoresHtml = result.scores
    ? Object.entries(result.scores)
        .map(([key, val]) => `
          <div class="score-row">
            <span>${key.replace(/_/g, ' ')}</span>
            <span>${val}%</span>
          </div>
          <div class="score-bar-wrap">
            <div class="score-bar-fill" style="width:${val}%"></div>
          </div>
        `)
        .join('')
    : '';

  return `
    <div class="verdict-value" style="color:${color};font-size:14px;font-weight:700;margin-bottom:6px;text-transform:capitalize;">
      ${(result.verdict ?? 'unknown').replace(/_/g, ' ')}
    </div>
    <div style="font-size:11px;color:#64748b;margin-bottom:10px;">
      Confidence: ${result.confidence ?? '—'}%
      ${result.risk_level ? ` · Risk: <strong>${result.risk_level}</strong>` : ''}
    </div>
    ${scoresHtml}
    ${signalsHtml ? `<ul class="signals-list" style="margin-top:8px">${signalsHtml}</ul>` : ''}
    ${result.explanation ? `<p style="font-size:11px;color:#94a3b8;margin-top:8px;line-height:1.5">${result.explanation}</p>` : ''}
  `;
}

function showSpinner(btn) {
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Analysing…';
}

function resetBtn(btn, label) {
  btn.disabled = false;
  btn.innerHTML = label;
}

// ---------------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));

    btn.classList.add('active');
    const panel = document.getElementById(`tab-${btn.dataset.tab}`);
    if (panel) panel.classList.add('active');
  });
});

// ---------------------------------------------------------------------------
// Current Page tab — load stored verdict
// ---------------------------------------------------------------------------
async function loadCurrentPageVerdict() {
  const urlEl       = document.getElementById('current-url');
  const verdictEl   = document.getElementById('url-verdict-value');
  const riskBadgeEl = document.getElementById('url-risk-badge');
  const confEl      = document.getElementById('url-confidence');
  const signalsEl   = document.getElementById('url-signals');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) urlEl.textContent = tab.url;

    const { lastUrlCheck } = await chrome.storage.local.get('lastUrlCheck');
    if (!lastUrlCheck) {
      verdictEl.textContent = 'Not checked yet';
      return;
    }

    const r = lastUrlCheck.result;
    verdictEl.textContent = (r.verdict ?? 'unknown').replace(/_/g, ' ');
    verdictEl.style.color = verdictColor(r.verdict ?? '');

    riskBadgeEl.textContent  = r.risk_level ?? '—';
    riskBadgeEl.className    = `badge ${riskBadgeClass(r.risk_level ?? '')}`;
    confEl.textContent        = `${r.confidence ?? '—'}%`;

    signalsEl.innerHTML = (r.signals ?? [])
      .map((s) => `<li><span>⚠</span>${s}</li>`)
      .join('');
  } catch (err) {
    console.error('[Verifai Popup]', err);
  }
}

// Re-check button
document.getElementById('recheck-btn').addEventListener('click', async () => {
  const btn = document.getElementById('recheck-btn');
  showSpinner(btn);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) throw new Error('No active tab URL');

    const res = await fetch(`${API_BASE}/url-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: tab.url }),
    });
    const result = await res.json();
    await chrome.storage.local.set({ lastUrlCheck: { url: tab.url, result, timestamp: Date.now() } });
    await loadCurrentPageVerdict();
  } catch (err) {
    console.error('[Verifai Popup] Re-check failed:', err);
  } finally {
    resetBtn(btn, '🔄 Re-check This Page');
  }
});

// ---------------------------------------------------------------------------
// Check Text tab
// ---------------------------------------------------------------------------
document.getElementById('analyze-text-btn').addEventListener('click', async () => {
  const btn      = document.getElementById('analyze-text-btn');
  const input    = document.getElementById('text-input');
  const errorEl  = document.getElementById('text-error');
  const resultEl = document.getElementById('text-result');

  const text = input.value.trim();
  if (!text) {
    errorEl.textContent = 'Please enter some text.';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display  = 'none';
  resultEl.style.display = 'none';
  showSpinner(btn);

  try {
    const formData = new FormData();
    formData.append('text', text);

    const res = await fetch(`${API_BASE}/analyze`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const result = await res.json();

    resultEl.innerHTML     = buildResultHTML(result);
    resultEl.style.display = 'block';
  } catch (err) {
    errorEl.textContent    = err.message;
    errorEl.style.display  = 'block';
  } finally {
    resetBtn(btn, 'Analyse Text');
  }
});

// ---------------------------------------------------------------------------
// Check URL tab
// ---------------------------------------------------------------------------
document.getElementById('check-url-btn').addEventListener('click', async () => {
  const btn      = document.getElementById('check-url-btn');
  const input    = document.getElementById('url-input');
  const errorEl  = document.getElementById('url-error');
  const resultEl = document.getElementById('url-result');

  const url = input.value.trim();
  if (!url) {
    errorEl.textContent = 'Please enter a URL.';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display  = 'none';
  resultEl.style.display = 'none';
  showSpinner(btn);

  try {
    const res = await fetch(`${API_BASE}/url-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const result = await res.json();

    resultEl.innerHTML     = buildResultHTML(result);
    resultEl.style.display = 'block';
  } catch (err) {
    errorEl.textContent    = err.message;
    errorEl.style.display  = 'block';
  } finally {
    resetBtn(btn, 'Check URL');
  }
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
loadCurrentPageVerdict();
