// Owner: Extension Lead
// File: extension/content.js
// Description: Content script injected into every page. Listens for text
//              selection events, injects a floating "Verify" button near the
//              selection, and shows an inline result overlay when the
//              background service worker sends back a verdict.

(function () {
  'use strict';

  const _browser = (typeof browser !== 'undefined') ? browser : chrome;

  // Guard against double-injection
  if (window.__verifaiInjected) return;
  window.__verifaiInjected = true;

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  const BUTTON_ID   = 'verifai-verify-btn';
  const OVERLAY_ID  = 'verifai-overlay';
  const BANNER_ID   = 'verifai-url-banner';
  const STYLE_ID    = 'verifai-styles';

  // Module-level store so Full Report always has the latest result in scope
  let _lastResult       = null;
  let _lastSelectedText = '';

  // ---------------------------------------------------------------------------
  // Inject styles
  // ---------------------------------------------------------------------------
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID} {
        position: absolute;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 16px 7px 10px;
        background: #fff;
        color: #1E3A5F;
        font-family: Inter, system-ui, sans-serif;
        font-size: 12px;
        font-weight: 600;
        border: 1.5px solid #1E3A5F;
        border-radius: 999px;
        cursor: pointer;
        box-shadow: 0 2px 12px rgba(0,0,0,0.15);
        transition: transform 0.15s, box-shadow 0.15s;
        user-select: none;
      }
      #${BUTTON_ID}:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      }
      #${BUTTON_ID} .vfai-logo {
        width: 20px; height: 20px;
        background: #1E3A5F;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        flex-shrink: 0;
        letter-spacing: -0.5px;
      }

      #${OVERLAY_ID} {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        width: 320px;
        background: white;
        border: 1px solid #E5E7EB;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        font-family: Inter, system-ui, sans-serif;
        color: #111827;
        overflow: hidden;
        animation: verifai-slide-in 0.3s cubic-bezier(0.34,1.56,0.64,1);
      }
      @keyframes verifai-slide-in {
        from { opacity: 0; transform: translateY(20px) scale(0.95); }
        to   { opacity: 1; transform: translateY(0)   scale(1);    }
      }
      .verifai-overlay-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: #F9FAFB;
        border-bottom: 1px solid #E5E7EB;
      }
      .verifai-overlay-title {
        font-size: 13px;
        font-weight: 700;
        color: #111827;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .verifai-overlay-close {
        background: none;
        border: none;
        color: #6B7280;
        cursor: pointer;
        font-size: 18px;
        padding: 0;
        line-height: 1;
      }
      .verifai-overlay-body {
        padding: 14px 16px;
      }
      .verifai-verdict {
        font-size: 15px;
        font-weight: 700;
        text-transform: capitalize;
        margin-bottom: 6px;
        color: #111827;
      }
      .verifai-confidence {
        font-size: 12px;
        color: #6B7280;
        margin-bottom: 10px;
      }
      .verifai-signals {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
      .verifai-signals li {
        background: #F3F4F6;
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 11px;
        color: #6B7280;
        font-weight: 500;
      }
      .verifai-open-link {
        display: inline-block;
        margin-top: 10px;
        font-size: 11px;
        color: #1E3A5F;
        text-decoration: none;
        font-weight: 600;
      }
      .verifai-selected-box {
        background: #F9FAFB;
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 14px;
      }
      .verifai-sc-label {
        font-size: 10px;
        color: #9CA3AF;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .verifai-sc-text {
        font-size: 13px;
        color: #111827;
        font-weight: 500;
        line-height: 1.4;
      }
      .verifai-score-section { margin: 12px 0; }
      .verifai-score-item    { margin-bottom: 10px; }
      .verifai-score-hdr {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        font-weight: 600;
        color: #111827;
        margin-bottom: 5px;
      }
      .verifai-score-track {
        height: 8px;
        background: #E5E7EB;
        border-radius: 999px;
        overflow: hidden;
      }
      .verifai-score-fill {
        height: 100%;
        border-radius: 999px;
        transition: width 0.5s ease;
      }
      .verifai-btn-row {
        display: flex;
        gap: 8px;
        margin-top: 14px;
      }
      .verifai-btn {
        flex: 1;
        padding: 11px 0;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border: none;
        font-family: Inter, system-ui, sans-serif;
        transition: transform 0.15s;
      }
      .verifai-btn:hover  { transform: translateY(-1px); }
      .verifai-btn:active { transform: scale(0.97); }
      .verifai-btn-primary   { background: #1E3A5F; color: #fff; }
      .verifai-btn-secondary { background: #fff; color: #374151; border: 1.5px solid #E5E7EB; }
      .verifai-loading {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 16px;
        font-size: 13px;
        color: #6B7280;
      }
      .verifai-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #E5E7EB;
        border-top-color: #1E3A5F;
        border-radius: 50%;
        animation: verifai-spin 0.7s linear infinite;
      }
      @keyframes verifai-spin {
        to { transform: rotate(360deg); }
      }

      #${BANNER_ID} {
        position: fixed;
        top: 16px;
        right: 16px;
        width: 420px;
        z-index: 2147483647;
        font-family: Inter, system-ui, sans-serif;
        box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        border-radius: 999px;
        overflow: hidden;
        transition: border-radius 0.2s ease;
      }
    `;
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // Floating "Verify" button
  // ---------------------------------------------------------------------------
  let verifyBtn = null;

  function showVerifyButton(x, y, selectedText) {
    removeVerifyButton();

    verifyBtn = document.createElement('button');
    verifyBtn.id = BUTTON_ID;
    verifyBtn.innerHTML = '<span class="vfai-logo">V</span>Verify with Verifai';
    verifyBtn.style.top  = `${y + window.scrollY + 8}px`;
    verifyBtn.style.left = `${x}px`;

    verifyBtn.addEventListener('click', () => {
      removeVerifyButton();
      showLoadingOverlay();
      _browser.runtime.sendMessage(
        { type: 'VERIFAI_CHECK_TEXT', text: selectedText },
        (result) => {
          if (result?.error) {
            showErrorOverlay(result.error);
          } else {
            _lastResult       = result;
            _lastSelectedText = selectedText;
            showResultOverlay(result, selectedText);
          }
        }
      );
    });

    document.body.appendChild(verifyBtn);
  }

  function removeVerifyButton() {
    const existing = document.getElementById(BUTTON_ID);
    if (existing) existing.remove();
    verifyBtn = null;
  }

  // ---------------------------------------------------------------------------
  // Overlay helpers
  // ---------------------------------------------------------------------------
  function removeOverlay() {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) existing.remove();
  }

  function verdictColor(verdict) {
    if (!verdict) return '#6B7280';
    if (verdict.includes('authentic') || verdict === 'safe') return '#15803D';
    if (verdict.includes('suspicious') || verdict.includes('manipulated')) return '#B45309';
    if (verdict.includes('ai_generated') || verdict.includes('dangerous')) return '#B91C1C';
    return '#6B7280';
  }

  function verdictBadgeStyle(verdict) {
    if (!verdict) return 'background:#F3F4F6;color:#6B7280';
    if (verdict.includes('authentic') || verdict === 'safe') return 'background:#DCFCE7;color:#15803D';
    if (verdict.includes('suspicious') || verdict.includes('manipulated')) return 'background:#FEF3C7;color:#B45309';
    if (verdict.includes('ai_generated') || verdict.includes('dangerous')) return 'background:#FEE2E2;color:#B91C1C';
    return 'background:#F3F4F6;color:#6B7280';
  }

  function buildOverlay(contentHtml) {
    removeOverlay();
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `
      <div class="verifai-overlay-header">
        <div class="verifai-overlay-title">
          <img src="${_browser.runtime.getURL('icons/logo.png')}"
               style="width:24px;height:24px;object-fit:contain;flex-shrink:0" alt="Verifai"/>
          <span>Verifai Lens</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:11px;color:#9CA3AF;font-style:italic">See through the noise</span>
          <button class="verifai-overlay-close" title="Close">×</button>
        </div>
      </div>
      <div class="verifai-overlay-body">
        ${contentHtml}
      </div>
    `;
    overlay.querySelector('.verifai-overlay-close').addEventListener('click', removeOverlay);
    document.body.appendChild(overlay);
    return overlay;
  }

  function showLoadingOverlay() {
    buildOverlay(`
      <div class="verifai-loading">
        <div class="verifai-spinner"></div>
        Analysing content…
      </div>
    `);
  }

  function showResultOverlay(result, selectedText) {
    const badgeStyle  = verdictBadgeStyle(result.verdict);
    const verdictText = (result.verdict || 'unknown').replace(/_/g, ' ').toUpperCase();

    // Selected content preview
    const previewHtml = selectedText
      ? `<div class="verifai-selected-box">
           <div class="verifai-sc-label">Selected content</div>
           <div class="verifai-sc-text">"${selectedText.slice(0, 80)}${selectedText.length > 80 ? '...' : ''}"</div>
         </div>`
      : '';

    // Score bars
    let scoresHtml = '';
    if (result.scores) {
      const ai  = result.scores.ai_generated  ?? 0;
      const ctx = result.scores.context_match ?? 0;
      const aiColor = ai < 40 ? '#22C55E' : ai <= 70 ? '#F59E0B' : '#EF4444';
      scoresHtml = `
        <div class="verifai-score-section">
          <div class="verifai-score-item">
            <div class="verifai-score-hdr">
              <span>AI Generated</span>
              <span style="color:${aiColor}">${ai}%</span>
            </div>
            <div class="verifai-score-track">
              <div class="verifai-score-fill" style="width:${ai}%;background:${aiColor}"></div>
            </div>
          </div>
          <div class="verifai-score-item">
            <div class="verifai-score-hdr">
              <span>Context Match</span>
              <span style="color:#22C55E">${ctx}%</span>
            </div>
            <div class="verifai-score-track">
              <div class="verifai-score-fill" style="width:${ctx}%;background:#22C55E"></div>
            </div>
          </div>
        </div>`;
    }

    // Signal chips
    const signalsHtml = (result.signals || [])
      .map((s) => `<li>${s}</li>`)
      .join('');

    const popupUrl = _browser.runtime.getURL('popup/popup.html');

    buildOverlay(`
      ${previewHtml}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <span style="${badgeStyle};padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700">
          ● ${verdictText}
        </span>
        <span style="font-size:26px;font-weight:700;color:#111827">${result.confidence ?? '—'}%</span>
      </div>
      ${scoresHtml}
      ${result.explanation
        ? `<p style="font-size:13px;color:#6B7280;font-style:italic;line-height:1.5;margin-bottom:10px">
             ${result.explanation}
           </p>`
        : ''}
      ${signalsHtml ? `<ul class="verifai-signals">${signalsHtml}</ul>` : ''}
      <div class="verifai-btn-row">
        <button class="verifai-btn verifai-btn-primary" id="vfai-full-report-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Full Report
        </button>
        <button class="verifai-btn verifai-btn-secondary" id="vfai-dashboard-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </button>
      </div>
    `);

    // Wire up buttons after buildOverlay inserts the DOM
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      overlay.querySelector('#vfai-full-report-btn')
        ?.addEventListener('click', () => {
          console.log('[Verifai] Saving report data:', _lastResult);
          _browser.storage.local.set({
            fullReportData: {
              result:       _lastResult       || result,
              analyzedText: _lastSelectedText || selectedText,
              sourceUrl:    window.location.href,
              timestamp:    Date.now(),
            },
          }, () => {
            console.log('[Verifai] Data saved, opening report page');
            // window.open() is blocked for extension URLs in Firefox content scripts;
            // route through background.js which can call _browser.tabs.create()
            _browser.runtime.sendMessage({ type: 'VERIFAI_OPEN_REPORT' });
          });
        });
      overlay.querySelector('#vfai-dashboard-btn')
        ?.addEventListener('click', () => window.open('http://localhost:8080/dashboard', '_blank'));
    }
  }

  function showErrorOverlay(message) {
    buildOverlay(`
      <div style="color:#B91C1C;font-size:13px;padding:4px 0;">
        ⚠ Error: ${message}
      </div>
    `);
  }

  // ---------------------------------------------------------------------------
  // URL credibility banner
  // ---------------------------------------------------------------------------
  function extractDomain(url) {
    try { return new URL(url).hostname; } catch (_) { return url; }
  }

  function injectUrlBanner(data) {
    const existing = document.getElementById(BANNER_ID);
    if (existing) existing.remove();

    const domain = data.domain || extractDomain(data.url || '');
    const isLow  = data.risk_level === 'low';
    const isHigh = data.risk_level === 'high';

    const theme = isLow ? {
      bg: '#F0FDF4', border: '#86EFAC',
      labelColor: '#15803D',
      label: 'Verified source',
      riskLabel: 'Low',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="#16A34A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
               <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
               <polyline points="9 12 11 14 15 10"/>
             </svg>`,
    } : isHigh ? {
      bg: '#FEF2F2', border: '#FCA5A5',
      labelColor: '#B91C1C',
      label: 'Suspicious domain',
      riskLabel: 'High',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="#DC2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
               <circle cx="12" cy="12" r="10"/>
               <line x1="15" y1="9" x2="9" y2="15"/>
               <line x1="9" y1="9" x2="15" y2="15"/>
             </svg>`,
    } : {
      bg: '#FFFBEB', border: '#FCD34D',
      labelColor: '#B45309',
      label: 'Unverified source',
      riskLabel: 'Medium',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="#D97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
               <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
               <line x1="12" y1="9" x2="12" y2="13"/>
               <line x1="12" y1="17" x2="12.01" y2="17"/>
             </svg>`,
    };

    // Parse stats from signals
    const signals     = data.signals || [];
    const hasSSLIssue = signals.some((s) => /ssl|certificate/i.test(s));

    // Domain Age: suspicious structural signals (TLD, IP, subdomains) mean
    // something is off; their absence on a low-risk site means established.
    const hasDomainWarning = signals.some((s) =>
      /suspicious.*domain|ip address|excessive subdomain/i.test(s));
    const domainAgeValue = hasDomainWarning
      ? 'Suspicious'
      : isLow  ? 'Established'
      : isHigh ? 'Unknown'
      : 'Unverified';
    const domainAgeColor = hasDomainWarning || isHigh ? '#DC2626'
      : isLow ? '#16A34A' : '#D97706';

    // Known Flags: GSB signals contain "Flagged" / "Safe Browsing"; URLScan tags
    // contain "URLScan tag:". If none present, a low-risk site is clean.
    const flagSig = signals.find((s) =>
      /phishing|malware|misinformation|flagged|threat|unwanted|harmful/i.test(s));
    const flagValue = flagSig
      ? flagSig.replace(/^Flagged by Google Safe Browsing:\s*/i, '').split(':')[0].trim()
      : isLow ? 'Clean' : 'None detected';
    const flagColor = flagSig ? '#DC2626' : isLow ? '#16A34A' : '#111827';

    const reputationHtml = isLow
      ? '<strong style="color:#16A34A">Good</strong>'
      : isHigh
        ? '<strong style="color:#DC2626">Poor</strong>'
        : '<strong style="color:#D97706">Unknown</strong>';

    const banner = document.createElement('div');
    banner.id    = BANNER_ID;

    // Pill row
    banner.innerHTML = `
      <div id="verifai-banner-pill" style="
        display:flex;align-items:center;gap:10px;
        padding:12px 20px;background:${theme.bg};
        border:1px solid ${theme.border};
      ">
        ${theme.icon}
        <span style="font-weight:700;color:${theme.labelColor};font-size:14px;white-space:nowrap">
          ${theme.label}
        </span>
        <span style="color:#9CA3AF;font-size:14px"> · </span>
        <span style="color:#374151;font-size:14px;white-space:nowrap;overflow:hidden;
                     text-overflow:ellipsis;min-width:0">
          Risk: ${theme.riskLabel} · ${domain}
        </span>
        <div style="margin-left:auto;display:flex;align-items:center;gap:12px;flex-shrink:0">
          <button id="verifai-details-btn" style="
            background:none;border:none;cursor:pointer;
            font-size:13px;font-weight:600;white-space:nowrap;
            color:${theme.labelColor};padding:0;
            font-family:Inter,system-ui,sans-serif;
          ">Details ∨</button>
          <button id="verifai-close-btn" style="
            background:none;border:none;cursor:pointer;
            font-size:18px;color:#9CA3AF;padding:0;line-height:1;
          ">×</button>
        </div>
      </div>
      <div id="verifai-banner-details" style="
        display:none;
        padding:0 20px 16px;
        background:${theme.bg};
        border-top:1px solid ${theme.border};
        grid-template-columns:1fr 1fr;
        gap:12px;
        font-size:13px;
        color:#6B7280;
        font-family:Inter,system-ui,sans-serif;
        line-height:1.6;
      ">
        <div>Domain Age: <strong style="color:${domainAgeColor}">
          ${domainAgeValue}
        </strong></div>
        <div>Reputation: ${reputationHtml}</div>
        <div>Known Flags: <strong style="color:${flagColor}">
          ${flagValue}
        </strong></div>
        <div>SSL: <strong style="color:${hasSSLIssue ? '#DC2626' : '#111827'}">
          ${hasSSLIssue ? 'Invalid' : 'Valid'}
        </strong></div>
      </div>
    `;

    // Apply card-level styles via JS (allows transition on borderRadius)
    Object.assign(banner.style, {
      position:   'fixed',
      top:        '16px',
      right:      '16px',
      width:      '420px',
      borderRadius: '999px',
      overflow:   'hidden',
    });

    document.body.appendChild(banner);

    // Details toggle
    document.getElementById('verifai-details-btn').addEventListener('click', () => {
      const detailsEl = document.getElementById('verifai-banner-details');
      const isOpen    = detailsEl.style.display === 'grid';
      detailsEl.style.display = isOpen ? 'none' : 'grid';
      banner.style.borderRadius = isOpen ? '999px' : '16px';
      document.getElementById('verifai-details-btn').textContent =
        isOpen ? 'Details ∨' : 'Details ∧';
    });

    // Close button
    document.getElementById('verifai-close-btn').addEventListener('click', () => {
      banner.remove();
    });
  }

  // ---------------------------------------------------------------------------
  // Text selection listener
  // ---------------------------------------------------------------------------
  document.addEventListener('mouseup', (e) => {
    // Small delay to let the selection finalise
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length > 20) {
        const range = selection.getRangeAt(0);
        const rect  = range.getBoundingClientRect();
        showVerifyButton(
          rect.left + window.scrollX,
          rect.bottom,
          text
        );
      } else {
        removeVerifyButton();
      }
    }, 50);
  });

  // Remove button when clicking elsewhere
  document.addEventListener('mousedown', (e) => {
    if (e.target?.id !== BUTTON_ID) removeVerifyButton();
  });

  // ---------------------------------------------------------------------------
  // Message listener — results pushed from background.js
  // ---------------------------------------------------------------------------
  _browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'VERIFAI_LOADING') {
      showLoadingOverlay();
    }
    if (message.type === 'VERIFAI_RESULT') {
      _lastResult = message.payload;
      showResultOverlay(message.payload);
    }
    if (message.type === 'VERIFAI_URL_RESULT') {
      injectUrlBanner(message.payload);
    }
  });

  injectStyles();
  console.log('[Verifai] Content script initialised.');
})();
