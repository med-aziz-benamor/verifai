// Owner: Extension Lead
// File: extension/content.js
// Description: Content script injected into every page. Listens for text
//              selection events, injects a floating "Verify" button near the
//              selection, and shows an inline result overlay when the
//              background service worker sends back a verdict.

(function () {
  'use strict';

  // Guard against double-injection
  if (window.__verifaiInjected) return;
  window.__verifaiInjected = true;

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  const BUTTON_ID   = 'verifai-verify-btn';
  const OVERLAY_ID  = 'verifai-overlay';
  const STYLE_ID    = 'verifai-styles';

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
        gap: 6px;
        padding: 6px 12px;
        background: #3b7af5;
        color: #fff;
        font-family: Inter, system-ui, sans-serif;
        font-size: 12px;
        font-weight: 600;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(59,122,245,0.4);
        transition: transform 0.15s, box-shadow 0.15s;
        user-select: none;
      }
      #${BUTTON_ID}:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(59,122,245,0.5);
      }

      #${OVERLAY_ID} {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        width: 320px;
        background: #0d1424;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        box-shadow: 0 24px 48px rgba(0,0,0,0.5);
        font-family: Inter, system-ui, sans-serif;
        color: #e2e8f0;
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
        background: rgba(59,122,245,0.15);
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .verifai-overlay-title {
        font-size: 13px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .verifai-overlay-close {
        background: none;
        border: none;
        color: #94a3b8;
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
      }
      .verifai-confidence {
        font-size: 12px;
        color: #94a3b8;
        margin-bottom: 10px;
      }
      .verifai-signals {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .verifai-signals li {
        font-size: 11px;
        color: #cbd5e1;
        display: flex;
        align-items: flex-start;
        gap: 6px;
        margin-bottom: 4px;
      }
      .verifai-open-link {
        display: inline-block;
        margin-top: 10px;
        font-size: 11px;
        color: #4f8ef7;
        text-decoration: none;
        font-weight: 600;
      }
      .verifai-loading {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 16px;
        font-size: 13px;
        color: #94a3b8;
      }
      .verifai-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #3b7af5;
        border-top-color: transparent;
        border-radius: 50%;
        animation: verifai-spin 0.7s linear infinite;
      }
      @keyframes verifai-spin {
        to { transform: rotate(360deg); }
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
    verifyBtn.innerHTML = '🔍 Verify';
    verifyBtn.style.top  = `${y + window.scrollY + 8}px`;
    verifyBtn.style.left = `${x}px`;

    verifyBtn.addEventListener('click', () => {
      removeVerifyButton();
      showLoadingOverlay();
      chrome.runtime.sendMessage(
        { type: 'VERIFAI_CHECK_TEXT', text: selectedText },
        (result) => {
          if (result?.error) {
            showErrorOverlay(result.error);
          } else {
            showResultOverlay(result);
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
    if (!verdict) return '#94a3b8';
    if (verdict.includes('authentic') || verdict === 'safe') return '#34d399';
    if (verdict.includes('suspicious') || verdict.includes('manipulated')) return '#fbbf24';
    if (verdict.includes('ai_generated') || verdict.includes('dangerous')) return '#f87171';
    return '#94a3b8';
  }

  function buildOverlay(contentHtml) {
    removeOverlay();
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `
      <div class="verifai-overlay-header">
        <div class="verifai-overlay-title">
          🛡️ Verifai Lens
        </div>
        <button class="verifai-overlay-close" title="Close">×</button>
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

  function showResultOverlay(result) {
    const color = verdictColor(result.verdict);
    const signalsHtml = (result.signals || [])
      .map((s) => `<li><span>⚠</span>${s}</li>`)
      .join('');

    buildOverlay(`
      <div class="verifai-verdict" style="color:${color}">
        ${(result.verdict || 'unknown').replace(/_/g, ' ')}
      </div>
      <div class="verifai-confidence">
        Confidence: ${result.confidence ?? '—'}%
        ${result.risk_level ? ` · Risk: ${result.risk_level}` : ''}
      </div>
      ${signalsHtml ? `<ul class="verifai-signals">${signalsHtml}</ul>` : ''}
      <a class="verifai-open-link" href="${
        chrome.runtime.getURL('popup/popup.html')
      }" target="_blank">Open full report →</a>
    `);
  }

  function showErrorOverlay(message) {
    buildOverlay(`
      <div style="color:#f87171;font-size:13px;padding:4px 0;">
        ⚠ Error: ${message}
      </div>
    `);
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
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'VERIFAI_LOADING') {
      showLoadingOverlay();
    }
    if (message.type === 'VERIFAI_RESULT') {
      showResultOverlay(message.payload);
    }
  });

  injectStyles();
  console.log('[Verifai] Content script initialised.');
})();
