// Owner: Extension Lead
// File: extension/report/report.js
// Description: Logic for the full analysis report page.

'use strict';

const _browser = (typeof browser !== 'undefined') ? browser : chrome;

// ─────────────────────────────────────────────────────────────────────────────
// Colour helpers
// ─────────────────────────────────────────────────────────────────────────────
function verdictBadgeClass(verdict) {
  const v = verdict || '';
  if (['authentic', 'likely_authentic', 'safe'].includes(v)) return 'badge-authentic';
  if (v === 'suspicious')                                      return 'badge-suspicious';
  if (['ai_generated', 'dangerous'].includes(v))              return 'badge-ai_generated';
  return 'badge-inconclusive';
}

function verdictColor(verdict) {
  const v = verdict || '';
  if (['authentic', 'likely_authentic', 'safe'].includes(v)) return '#15803D';
  if (v === 'suspicious')                                      return '#B45309';
  if (['ai_generated', 'dangerous'].includes(v))              return '#B91C1C';
  return '#6B7280';
}

function verdictLabel(verdict) {
  const map = {
    authentic:        '● AUTHENTIC',
    likely_authentic: '● LIKELY AUTHENTIC',
    safe:             '● SAFE',
    suspicious:       '● SUSPICIOUS',
    ai_generated:     '● AI GENERATED',
    dangerous:        '● DANGEROUS',
    inconclusive:     '● INCONCLUSIVE',
  };
  return map[verdict] || `● ${(verdict || 'unknown').replace(/_/g, ' ').toUpperCase()}`;
}

function aiBarColor(score) {
  if (score < 40)  return '#22C55E';
  if (score <= 70) return '#F59E0B';
  return '#EF4444';
}

// ─────────────────────────────────────────────────────────────────────────────
// renderReport — fills all sections from stored data
// ─────────────────────────────────────────────────────────────────────────────
function renderReport(result, analyzedText, sourceUrl, timestamp) {

  // ── Section 1: Timestamp ──────────────────────────────────────────────────
  const dt = new Date(timestamp || Date.now());
  document.getElementById('report-date').textContent =
    dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  document.getElementById('report-time').textContent =
    dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  // ── Section 2: Analyzed Content ──────────────────────────────────────────
  document.getElementById('analyzed-text').textContent =
    analyzedText || 'No content available';
  document.getElementById('source-url').textContent =
    sourceUrl || 'Unknown source';

  // ── Section 3: Verdict ───────────────────────────────────────────────────
  const verdict    = result.verdict || 'inconclusive';
  const confidence = result.confidence ?? 0;
  const color      = verdictColor(verdict);

  const badgeEl = document.getElementById('verdict-badge');
  badgeEl.textContent = verdictLabel(verdict);
  badgeEl.className   = `verdict-badge-large ${verdictBadgeClass(verdict)}`;

  const confEl = document.getElementById('confidence-value');
  confEl.textContent  = `${confidence}%`;
  confEl.style.color  = color;

  const methodCount = result.scores ? Object.keys(result.scores).length : 1;
  document.getElementById('verdict-subtext').textContent =
    `confidence score based on ${methodCount + 1} detection method${methodCount + 1 !== 1 ? 's' : ''}`;

  // ── Section 4: Score Breakdown ────────────────────────────────────────────
  const scoresContainer = document.getElementById('scores-container');
  scoresContainer.innerHTML = '';

  const scoreDescriptions = {
    ai_generated:  'Probability this text was written by an AI model',
    context_match: 'How well this text fits its surrounding context',
  };

  const scores = result.scores || {};
  if (Object.keys(scores).length === 0) {
    scores.ai_generated = confidence;
  }

  Object.entries(scores).forEach(([key, val]) => {
    const barColor  = key === 'ai_generated' ? aiBarColor(val) : '#22C55E';
    const desc      = scoreDescriptions[key] || '';
    const labelText = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const item = document.createElement('div');
    item.className = 'score-item';
    item.innerHTML = `
      <div class="score-header-row">
        <span class="score-label">${labelText}</span>
        <span class="score-pct" style="color:${barColor}">${val}%</span>
      </div>
      <div class="score-track">
        <div class="score-fill" data-width="${val}" style="background:${barColor}"></div>
      </div>
      ${desc ? `<div class="score-desc">${desc}</div>` : ''}
    `;
    scoresContainer.appendChild(item);
  });

  // Animate bars after paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll('.score-fill[data-width]').forEach((fill) => {
        fill.style.width = fill.dataset.width + '%';
      });
    });
  });

  // ── Section 5: Signals ───────────────────────────────────────────────────
  const signals = result.signals || [];
  const sigContainer = document.getElementById('signals-container');
  sigContainer.innerHTML = '';

  if (signals.length === 0) {
    sigContainer.innerHTML = '<p class="no-signals">No specific signals detected.</p>';
  } else {
    signals.forEach((s) => {
      const isWarning = /unavailable|disagree|mixed|short/i.test(s);
      const icon      = isWarning ? '⚠' : (verdict === 'authentic' || verdict === 'likely_authentic' ? '✓' : '⚠');
      const iconColor = isWarning ? '#B45309' : (verdict === 'authentic' || verdict === 'likely_authentic' ? '#15803D' : '#B45309');
      const row = document.createElement('div');
      row.className = 'signal-row';
      row.innerHTML = `
        <span class="signal-icon" style="color:${iconColor}">${icon}</span>
        <span class="signal-text">${s}</span>
      `;
      sigContainer.appendChild(row);
    });
  }

  // ── Section 6: Explanation ───────────────────────────────────────────────
  document.getElementById('explanation-text').textContent =
    result.explanation || 'No explanation available.';

  // ── Section 7: Detection Methods ─────────────────────────────────────────
  const hfUnavailable = signals.some((s) =>
    s.toLowerCase().includes('huggingface unavailable'));

  const methods = [
    { name: 'Groq Llama 3.3 70B',    desc: 'Context & reasoning analysis',          available: true },
    { name: 'HuggingFace RoBERTa',   desc: 'ChatGPT-detector — Pattern detection',  available: !hfUnavailable },
  ];

  const methodsContainer = document.getElementById('methods-container');
  methodsContainer.innerHTML = '';

  methods.forEach((m) => {
    const row = document.createElement('div');
    row.className = 'method-row';
    row.innerHTML = `
      <span class="method-icon" style="color:${m.available ? '#15803D' : '#9CA3AF'}">
        ${m.available ? '✓' : '✗'}
      </span>
      <div>
        <div class="method-name${m.available ? '' : ' unavailable'}">${m.name}</div>
        <div class="method-desc">${m.desc}</div>
      </div>
      <span class="method-label ${m.available ? 'ok' : 'off'}">
        ${m.available ? 'Active' : 'Unavailable'}
      </span>
    `;
    methodsContainer.appendChild(row);
  });

  // ── Show report ───────────────────────────────────────────────────────────
  document.getElementById('loading-state').style.display  = 'none';
  document.getElementById('report-content').style.display = 'block';

  // ── Store refs for Copy button ────────────────────────────────────────────
  window.__reportData = { result, analyzedText, sourceUrl, timestamp };
}

// ─────────────────────────────────────────────────────────────────────────────
// Button handlers
// ─────────────────────────────────────────────────────────────────────────────
document.getElementById('btn-pdf').addEventListener('click', () => window.print());

document.getElementById('btn-copy').addEventListener('click', async () => {
  const btn = document.getElementById('btn-copy');
  const d   = window.__reportData;
  if (!d) return;

  const { result, analyzedText, sourceUrl, timestamp } = d;
  const dt       = new Date(timestamp || Date.now());
  const dateStr  = dt.toLocaleString('en-GB');
  const signals  = (result.signals || []).map((s) => `- ${s}`).join('\n');
  const aiScore  = result.scores?.ai_generated  ?? result.confidence ?? '—';
  const ctxScore = result.scores?.context_match ?? '—';

  const plainText = [
    'VERIFAI ANALYSIS REPORT',
    `Generated: ${dateStr}`,
    '',
    `Verdict: ${result.verdict || 'inconclusive'} (${result.confidence ?? 0}%)`,
    '',
    `Analyzed text: ${analyzedText || 'N/A'}`,
    '',
    `Source: ${sourceUrl || 'Unknown'}`,
    '',
    'Scores:',
    `- AI Generated: ${aiScore}%`,
    `- Context Match: ${ctxScore}%`,
    '',
    'Signals:',
    signals || '- None detected',
    '',
    `Explanation: ${result.explanation || 'N/A'}`,
    '',
    'Generated by Verifai Lens',
  ].join('\n');

  try {
    await navigator.clipboard.writeText(plainText);
    const original = btn.innerHTML;
    btn.textContent      = '✓ Copied!';
    btn.style.background = '#DCFCE7';
    btn.style.color      = '#15803D';
    btn.style.borderColor = '#86EFAC';
    setTimeout(() => {
      btn.innerHTML         = original;
      btn.style.background  = '';
      btn.style.color       = '';
      btn.style.borderColor = '';
    }, 2000);
  } catch (_) {
    btn.textContent = 'Copy failed';
    setTimeout(() => { btn.textContent = 'Copy Report'; }, 2000);
  }
});

document.getElementById('btn-close').addEventListener('click', () => window.close());

// ─────────────────────────────────────────────────────────────────────────────
// Cross-browser storage helper
// Chrome uses callbacks; Firefox returns Promises (callback is ignored).
// ─────────────────────────────────────────────────────────────────────────────
function storageGet(keys) {
  if (typeof browser !== 'undefined') {
    return browser.storage.local.get(keys);
  }
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

// ─────────────────────────────────────────────────────────────────────────────
// Load data — script is deferred so DOM is ready when this runs
// ─────────────────────────────────────────────────────────────────────────────
storageGet(['fullReportData']).then((data) => {
  const report = data.fullReportData;

  if (!report || !report.result) {
    document.getElementById('loading-state').innerHTML = `
      <div style="text-align:center;padding:60px 40px">
        <div style="font-size:48px;margin-bottom:16px">⚠️</div>
        <h2 style="color:#1E3A5F;margin-bottom:8px;font-family:Inter,system-ui,sans-serif">
          No report data found
        </h2>
        <p style="color:#6B7280;font-size:14px;margin-bottom:24px;
                  font-family:Inter,system-ui,sans-serif;line-height:1.6">
          Please select text on a webpage and click<br>
          "Verify with Verifai" first, then open the full report.
        </p>
        <button onclick="window.close()"
          style="background:#1E3A5F;color:white;border:none;
                 padding:10px 24px;border-radius:8px;cursor:pointer;
                 font-size:14px;font-weight:600;font-family:Inter,system-ui,sans-serif">
          Close
        </button>
      </div>`;
    return;
  }

  renderReport(
    report.result,
    report.analyzedText,
    report.sourceUrl,
    report.timestamp,
  );
}).catch((err) => {
  console.error('[Verifai] Storage read error:', err);
  document.getElementById('loading-state').innerHTML = `
    <div style="text-align:center;padding:60px 40px">
      <p style="color:#DC2626;font-size:14px;font-family:Inter,system-ui,sans-serif">
        Error loading report: ${err.message}
      </p>
      <button onclick="window.close()"
        style="margin-top:16px;background:#1E3A5F;color:white;border:none;
               padding:10px 24px;border-radius:8px;cursor:pointer;
               font-size:14px;font-weight:600;font-family:Inter,system-ui,sans-serif">
        Close
      </button>
    </div>`;
});
