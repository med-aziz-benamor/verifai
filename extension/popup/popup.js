// Owner: Extension Lead
// File: extension/popup/popup.js
// Description: Popup controller — loads URL verdict, wires tabs, and handles
//              manual text/URL analysis forms via background.js messaging.

'use strict';

const _browser = (typeof browser !== 'undefined') ? browser : chrome;

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------
function verdictBadgeClass(verdict = '') {
  if (['authentic', 'likely_authentic', 'safe'].includes(verdict)) return 'badge-authentic';
  if (verdict === 'suspicious')                                      return 'badge-suspicious';
  if (['ai_generated', 'dangerous'].includes(verdict))              return 'badge-ai-generated';
  return 'badge-inconclusive';
}

function verdictColor(verdict = '') {
  if (['authentic', 'likely_authentic', 'safe'].includes(verdict)) return '#15803D';
  if (verdict === 'suspicious')                                      return '#B45309';
  if (['ai_generated', 'dangerous'].includes(verdict))              return '#B91C1C';
  return '#6B7280';
}

function aiBarColor(score) {
  if (score < 40)  return '#22C55E';
  if (score <= 70) return '#F59E0B';
  return '#EF4444';
}

function verdictLabel(verdict = '') {
  const map = {
    authentic:        '● AUTHENTIC',
    likely_authentic: '● LIKELY AUTHENTIC',
    safe:             '● SAFE',
    suspicious:       '● SUSPICIOUS',
    ai_generated:     '● AI GENERATED',
    dangerous:        '● DANGEROUS',
    inconclusive:     '● INCONCLUSIVE',
  };
  return map[verdict] ?? `● ${verdict.replace(/_/g, ' ').toUpperCase()}`;
}

function riskBadge(risk = '') {
  if (risk === 'low')    return { style: 'background:#DCFCE7;color:#15803D', label: '● VERIFIED',   color: '#15803D' };
  if (risk === 'medium') return { style: 'background:#FEF3C7;color:#B45309', label: '● UNVERIFIED', color: '#B45309' };
  if (risk === 'high')   return { style: 'background:#FEE2E2;color:#B91C1C', label: '● SUSPICIOUS', color: '#B91C1C' };
  return { style: 'background:#F3F4F6;color:#6B7280', label: '● UNKNOWN', color: '#6B7280' };
}

// ---------------------------------------------------------------------------
// Loading HTML (used inside result divs)
// ---------------------------------------------------------------------------
const LOADING_HTML = `
  <div style="text-align:center;padding:20px">
    <div style="width:24px;height:24px;border:3px solid #E5E7EB;
                border-top-color:#3B82F6;border-radius:50%;
                animation:spin 0.8s linear infinite;margin:0 auto 8px"></div>
    <p style="color:#6B7280;font-size:13px">Analyzing...</p>
  </div>`;

// ---------------------------------------------------------------------------
// Shared chip builder
// ---------------------------------------------------------------------------
function chipsHTML(signals = []) {
  if (!signals.length) return '';
  const chips = signals
    .map((s) => `<span style="background:#F3F4F6;border-radius:6px;padding:4px 10px;
                               font-size:11px;color:#6B7280;font-weight:500">${s}</span>`)
    .join('');
  return `<div style="display:flex;flex-wrap:wrap;gap:6px">${chips}</div>`;
}

// ---------------------------------------------------------------------------
// renderResultInDiv — text analysis result (verdict + scores + explanation)
// ---------------------------------------------------------------------------
function renderResultInDiv(divId, result) {
  const el = document.getElementById(divId);
  if (!el) return;

  if (result?.error) {
    el.innerHTML     = `<p style="color:#DC2626;font-size:12px">⚠ ${result.error}</p>`;
    el.style.display = 'block';
    return;
  }

  const color      = verdictColor(result.verdict ?? '');
  const badgeClass = verdictBadgeClass(result.verdict ?? '');
  const label      = verdictLabel(result.verdict ?? '');

  const scoresHtml = result.scores
    ? Object.entries(result.scores).map(([key, val]) => {
        const isAI     = key === 'ai_generated';
        const barColor = isAI ? aiBarColor(val) : '#22C55E';
        return `
          <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;
                        font-size:13px;font-weight:600;margin-bottom:5px">
              <span style="color:#111827">${key.replace(/_/g, ' ')}</span>
              <span style="color:${barColor}">${val}%</span>
            </div>
            <div style="height:8px;background:#E5E7EB;border-radius:999px;overflow:hidden">
              <div style="height:100%;width:${val}%;background:${barColor};
                          border-radius:999px;transition:width 0.6s"></div>
            </div>
          </div>`;
      }).join('')
    : '';

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <span class="verdict-badge ${badgeClass}">${label}</span>
      <span style="font-size:24px;font-weight:700;color:${color}">${result.confidence ?? '—'}%</span>
    </div>
    ${scoresHtml}
    ${result.explanation
      ? `<p style="font-size:13px;color:#6B7280;font-style:italic;line-height:1.5;margin-bottom:10px">
           ${result.explanation}
         </p>`
      : ''}
    ${chipsHTML(result.signals ?? [])}
  `;
  el.style.display = 'block';
}

// ---------------------------------------------------------------------------
// renderUrlResultInDiv — URL analysis result (risk badge + explanation)
// ---------------------------------------------------------------------------
function renderUrlResultInDiv(divId, result) {
  const el = document.getElementById(divId);
  if (!el) return;

  if (result?.error) {
    el.innerHTML     = `<p style="color:#DC2626;font-size:12px">⚠ ${result.error}</p>`;
    el.style.display = 'block';
    return;
  }

  const { style, label, color } = riskBadge(result.risk_level ?? '');
  const conf = result.confidence ?? 0;

  let domain = '';
  try { domain = new URL(result.url ?? '').hostname; } catch (_) {}

  el.innerHTML = `
    ${domain ? `<p style="font-size:11px;color:#9CA3AF;margin-bottom:8px">${domain}</p>` : ''}
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <span style="${style};padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700">
        ${label}
      </span>
      <span style="font-size:24px;font-weight:700;color:${color}">${conf}%</span>
    </div>
    ${result.explanation
      ? `<p style="font-size:13px;color:#6B7280;font-style:italic;line-height:1.5;margin-bottom:10px">
           ${result.explanation}
         </p>`
      : ''}
    ${chipsHTML(result.signals ?? [])}
  `;
  el.style.display = 'block';
}

// ---------------------------------------------------------------------------
// sendMessage — Promise wrapper (works Chrome + Firefox)
// ---------------------------------------------------------------------------
function sendMessage(msg) {
  if (typeof browser !== 'undefined') {
    return browser.runtime.sendMessage(msg);
  }
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b)  => b.classList.remove('active'));
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
  const previewEl = document.getElementById('selected-text-preview');
  const badgeEl   = document.getElementById('verdict-badge');
  const confEl    = document.getElementById('confidence-value');
  const aiValEl   = document.getElementById('ai-score-value');
  const aiBarEl   = document.getElementById('ai-score-bar');
  const ctxValEl  = document.getElementById('context-score-value');
  const ctxBarEl  = document.getElementById('context-score-bar');
  const explEl    = document.getElementById('explanation-text');
  const chipsEl   = document.getElementById('signals-chips');

  try {
    const [tab] = await _browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && previewEl) {
      try { previewEl.textContent = `"${new URL(tab.url).hostname}"`; } catch (_) {}
    }

    const { lastUrlCheck } = await _browser.storage.local.get('lastUrlCheck');
    if (!lastUrlCheck) {
      if (explEl) explEl.textContent =
        'This page has not been checked yet. Click Full Report to analyse it.';
      return;
    }

    const r     = lastUrlCheck.result;
    const conf  = r.confidence ?? 0;
    const color = verdictColor(r.verdict ?? '');

    if (previewEl && lastUrlCheck.url) {
      try { previewEl.textContent = `"${new URL(lastUrlCheck.url).hostname}"`; } catch (_) {}
    }

    badgeEl.textContent = verdictLabel(r.verdict ?? '');
    badgeEl.className   = `verdict-badge ${verdictBadgeClass(r.verdict ?? '')}`;

    confEl.textContent  = `${conf}%`;
    confEl.style.color  = color;

    if (r.scores) {
      const aiVal  = r.scores.ai_generated  ?? 0;
      const ctxVal = r.scores.context_match ?? 0;
      const aiColor = aiBarColor(aiVal);

      aiValEl.textContent      = `${aiVal}%`;
      aiValEl.style.color      = aiColor;
      aiBarEl.style.width      = `${aiVal}%`;
      aiBarEl.style.background = aiColor;

      ctxValEl.textContent     = `${ctxVal}%`;
      ctxValEl.style.color     = '#22C55E';
      ctxBarEl.style.width     = `${ctxVal}%`;
    } else {
      const aiColor = aiBarColor(conf);
      aiValEl.textContent      = `${conf}%`;
      aiValEl.style.color      = aiColor;
      aiBarEl.style.width      = `${conf}%`;
      aiBarEl.style.background = aiColor;

      const sigCount           = (r.signals ?? []).length;
      ctxValEl.textContent     = `${sigCount} signal${sigCount !== 1 ? 's' : ''}`;
      ctxValEl.style.color     = '#22C55E';
      ctxBarEl.style.width     = `${Math.min(sigCount * 25, 100)}%`;
    }

    if (explEl) explEl.textContent =
      r.explanation ?? (r.signals ?? []).join(' · ') ?? '';

    if (chipsEl) {
      chipsEl.innerHTML = (r.signals ?? [])
        .map((s) => `<span class="signal-chip">${s}</span>`)
        .join('');
    }

  } catch (err) {
    console.error('[Verifai Popup]', err);
    if (explEl) explEl.textContent = 'Could not load page analysis.';
  }
}

// ---------------------------------------------------------------------------
// Place 2 — Full Report + Dashboard buttons
// ---------------------------------------------------------------------------
document.getElementById('full-report-btn').addEventListener('click', () => {
  _browser.storage.local.get(['lastUrlCheck'], (data) => {
    const check = data.lastUrlCheck;
    _browser.storage.local.set({
      fullReportData: {
        result:       check?.result     || {},
        analyzedText: check?.url        || '',
        sourceUrl:    check?.url        || 'Unknown source',
        timestamp:    check?.timestamp  || Date.now(),
      },
    }, () => {
      _browser.tabs.create({ url: _browser.runtime.getURL('report/report.html') });
    });
  });
});

document.getElementById('dashboard-btn').addEventListener('click', () => {
  _browser.tabs.create({ url: 'http://localhost:8080/dashboard' });
});

// ---------------------------------------------------------------------------
// Place 3 — Check Text tab
// ---------------------------------------------------------------------------
const ANALYSE_TEXT_LABEL = 'Analyse Text';

document.getElementById('analyze-text-btn').addEventListener('click', async () => {
  const btn      = document.getElementById('analyze-text-btn');
  const input    = document.getElementById('text-input');
  const errorEl  = document.getElementById('text-error');
  const resultEl = document.getElementById('text-result');

  errorEl.style.display  = 'none';

  const text = input.value.trim();

  if (!text) {
    errorEl.textContent   = 'Please enter some text.';
    errorEl.style.display = 'block';
    return;
  }

  if (text.length < 80) {
    errorEl.textContent   = 'Text too short (80 chars minimum).';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled           = true;
  btn.textContent        = 'Analysing…';
  resultEl.innerHTML     = LOADING_HTML;
  resultEl.style.display = 'block';

  try {
    const result = await sendMessage({ type: 'VERIFAI_CHECK_TEXT', text });
    renderResultInDiv('text-result', result);
  } catch (err) {
    errorEl.textContent    = err.message;
    errorEl.style.display  = 'block';
    resultEl.style.display = 'none';
  } finally {
    btn.disabled    = false;
    btn.textContent = ANALYSE_TEXT_LABEL;
  }
});

// ---------------------------------------------------------------------------
// Place 4 — Check URL tab
// ---------------------------------------------------------------------------
const CHECK_URL_LABEL = 'Check URL';

document.getElementById('check-url-btn').addEventListener('click', async () => {
  const btn      = document.getElementById('check-url-btn');
  const input    = document.getElementById('url-input');
  const errorEl  = document.getElementById('url-error');
  const resultEl = document.getElementById('url-result');

  errorEl.style.display  = 'none';

  const url = input.value.trim();

  if (!url) {
    errorEl.textContent   = 'Please enter a URL.';
    errorEl.style.display = 'block';
    return;
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    errorEl.textContent   = 'Please enter a valid URL starting with https://';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled           = true;
  btn.textContent        = 'Checking…';
  resultEl.innerHTML     = LOADING_HTML;
  resultEl.style.display = 'block';

  try {
    const result = await sendMessage({ type: 'VERIFAI_CHECK_URL', url });
    renderUrlResultInDiv('url-result', result);
  } catch (err) {
    errorEl.textContent    = err.message;
    errorEl.style.display  = 'block';
    resultEl.style.display = 'none';
  } finally {
    btn.disabled    = false;
    btn.textContent = CHECK_URL_LABEL;
  }
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
loadCurrentPageVerdict();
