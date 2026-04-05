// Owner: Extension Lead
// File: extension/platforms/facebook.js
// Description: Facebook-specific content script. Injects a "Verify Comment"
//              button on every article (post or comment) and shows an AI
//              comment analysis popup when clicked.

(function () {
  'use strict';
  if (window.__verifaiFacebookInjected) return;
  window.__verifaiFacebookInjected = true;

  const _browser = (typeof browser !== 'undefined') ? browser : chrome;
  const PROCESSED_ATTR = 'data-verifai-done';

  // ── STYLES ──────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    .verifai-post-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      margin: 0 4px;
      background: #F0F2F5;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      color: #65676B;
      cursor: pointer;
      font-family: Helvetica, Arial, sans-serif;
      transition: background 0.15s;
      vertical-align: middle;
      white-space: nowrap;
    }
    .verifai-post-btn:hover {
      background: #E4E6E9;
      color: #1877F2;
    }
    .verifai-post-btn.loading { opacity: 0.6; pointer-events: none; }
    @keyframes verifai-spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);

  // ── INJECT BUTTON on every article (posts and comments) ─
  function processArticle(article) {
    if (article.getAttribute(PROCESSED_ATTR)) return;
    article.setAttribute(PROCESSED_ATTR, 'true');

    const btn = document.createElement('button');
    btn.className = 'verifai-post-btn';
    btn.innerHTML = `
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
      Verify Comment
    `;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleVerify(article, btn);
    });

    article.appendChild(btn);
  }

  function getDepth(el, ancestor) {
    let d = 0, cur = el;
    while (cur && cur !== ancestor) { d++; cur = cur.parentElement; }
    return d;
  }

  // ── HANDLE VERIFY CLICK ──────────────────────────────────
  async function handleVerify(article, btn) {
    btn.classList.add('loading');
    btn.textContent = 'Analyzing...';
    showLoadingPopup();

    try {
      const postText    = extractPostText(article);
      const imageBase64 = null; // Comments don't need image analysis

      console.log('[Verifai] Comment text:', postText?.substring(0, 50));

      const textToAnalyze = postText && postText.length >= 20 ? postText : null;
      const textResult    = textToAnalyze ? await analyzeText(textToAnalyze) : null;
      const imageResult   = null;

      closePopup();

      if (!textResult) {
        showErrorPopup('This comment is too short to analyze (needs 20+ characters).');
      } else {
        showResultPopup(textResult, imageResult, postText);
      }

    } catch (err) {
      closePopup();
      console.error('[Verifai]', err);
      showErrorPopup('Analysis failed: ' + err.message);
    } finally {
      btn.classList.remove('loading');
      btn.innerHTML = `
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        Verify Comment
      `;
    }
  }

  // ── EXTRACT TEXT ─────────────────────────────────────────
  function extractPostText(article) {
    const divs = article.querySelectorAll('div[dir="auto"], span[dir="auto"]');
    let best = '';
    for (const div of divs) {
      const text = div.innerText?.trim();
      if (text && text.length > best.length) best = text;
    }
    return best || null;
  }

  // ── API CALL — routed through background.js (bypasses Facebook CSP) ───────
  function analyzeText(text) {
    return new Promise((resolve, reject) => {
      _browser.runtime.sendMessage(
        { type: 'VERIFAI_CHECK_TEXT', text, page_url: window.location.href },
        (result) => {
          if (_browser.runtime.lastError) reject(new Error(_browser.runtime.lastError.message));
          else if (result?.error)         reject(new Error(result.error));
          else                            resolve(result);
        }
      );
    });
  }

  // ── POPUPS ────────────────────────────────────────────────
  function closePopup() {
    document.getElementById('verifai-post-popup')?.remove();
  }

  function showLoadingPopup() {
    closePopup();
    const el = document.createElement('div');
    el.id = 'verifai-post-popup';
    el.innerHTML = `<div style="
      position:fixed;top:50%;right:24px;transform:translateY(-50%);
      width:300px;background:white;border-radius:16px;
      box-shadow:0 8px 40px rgba(0,0,0,0.18);border:1px solid #E5E7EB;
      font-family:Inter,system-ui,sans-serif;z-index:2147483647;
      padding:32px 20px;text-align:center;
    ">
      <div style="width:28px;height:28px;border:3px solid #E5E7EB;
        border-top-color:#3B82F6;border-radius:50%;
        animation:verifai-spin 0.8s linear infinite;margin:0 auto 12px"></div>
      <p style="color:#1E3A5F;font-weight:700;font-size:14px;margin:0 0 4px">
        Analyzing comment...
      </p>
      <p style="color:#9CA3AF;font-size:12px;margin:0">Checking with AI</p>
    </div>`;
    document.body.appendChild(el);
  }

  function showErrorPopup(msg) {
    closePopup();
    const el = document.createElement('div');
    el.id = 'verifai-post-popup';
    el.innerHTML = `<div style="
      position:fixed;top:50%;right:24px;transform:translateY(-50%);
      width:300px;background:white;border-radius:16px;
      box-shadow:0 8px 40px rgba(0,0,0,0.18);border:1px solid #E5E7EB;
      font-family:Inter,system-ui,sans-serif;z-index:2147483647;
      padding:24px;text-align:center;
    ">
      <div style="font-size:32px;margin-bottom:8px">⚠️</div>
      <p style="color:#1E3A5F;font-weight:700;font-size:14px;margin:0 0 6px">
        Cannot analyze
      </p>
      <p style="color:#6B7280;font-size:13px;margin:0 0 14px">${msg}</p>
      <button onclick="document.getElementById('verifai-post-popup').remove()"
        style="background:#1E3A5F;color:white;border:none;padding:8px 20px;
        border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">OK</button>
    </div>`;
    document.body.appendChild(el);
    setTimeout(closePopup, 5000);
  }

  function showResultPopup(textResult, imageResult, postText) {
    closePopup();

    const scores = [];
    if (textResult?.confidence  != null) scores.push(textResult.confidence);
    if (imageResult?.confidence != null) scores.push(imageResult.confidence);
    const overall = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const verdictLabel = overall >= 75 ? '● AI GENERATED' :
                         overall >= 50 ? '● SUSPICIOUS'   : '● AUTHENTIC';
    const verdictBg    = overall >= 75 ? '#FEE2E2' :
                         overall >= 50 ? '#FEF3C7' : '#DCFCE7';
    const verdictColor = overall >= 75 ? '#B91C1C' :
                         overall >= 50 ? '#B45309' : '#15803D';

    const aiScore  = textResult?.scores?.ai_generated  ?? 0;
    const ctxScore = textResult?.scores?.context_match ?? 0;
    const imgScore = imageResult?.scores?.ai_generated ?? (imageResult?.confidence ?? 0);

    const aiBarColor  = aiScore  > 70 ? '#EF4444' : aiScore  > 40 ? '#F59E0B' : '#22C55E';
    const imgBarColor = imgScore > 70 ? '#EF4444' : imgScore > 40 ? '#F59E0B' : '#22C55E';

    const signals = [...(textResult?.signals || []), ...(imageResult?.signals || [])]
      .filter((s, i, a) => a.indexOf(s) === i).slice(0, 4);
    const explanation = textResult?.explanation || imageResult?.explanation || '';
    const preview     = (postText || 'Facebook comment').substring(0, 80);

    const el = document.createElement('div');
    el.id = 'verifai-post-popup';
    el.innerHTML = `<div style="
      position:fixed;top:50%;right:24px;transform:translateY(-50%);
      width:320px;background:white;border-radius:16px;
      box-shadow:0 8px 40px rgba(0,0,0,0.18);border:1px solid #E5E7EB;
      font-family:Inter,system-ui,sans-serif;z-index:2147483647;overflow:hidden;
    ">
      <div style="display:flex;align-items:center;justify-content:space-between;
        padding:14px 16px;border-bottom:1px solid #F3F4F6">
        <div style="display:flex;align-items:center;gap:8px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="#1E3A5F" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <span style="font-weight:700;font-size:13px;color:#1E3A5F">
            Verifai Comment Analysis
          </span>
        </div>
        <button id="verifai-close-x" style="background:none;border:none;
          cursor:pointer;font-size:18px;color:#9CA3AF;padding:0">×</button>
      </div>
      <div style="padding:16px">
        <div style="background:#F9FAFB;border-radius:10px;
          padding:10px 12px;margin-bottom:14px">
          <div style="font-size:10px;color:#9CA3AF;text-transform:uppercase;
            letter-spacing:0.5px;margin-bottom:4px">Analyzed Comment</div>
          <div style="font-size:13px;color:#111827;font-weight:500;
            line-height:1.4;font-style:italic">
            "${preview}${(postText || '').length > 80 ? '…' : ''}"
          </div>
        </div>

        <div style="display:flex;align-items:center;
          justify-content:space-between;margin-bottom:14px">
          <span style="padding:6px 14px;border-radius:999px;font-size:12px;
            font-weight:700;background:${verdictBg};color:${verdictColor}">
            ${verdictLabel}
          </span>
          <span style="font-size:28px;font-weight:700;color:#111827">${overall}%</span>
        </div>

        ${textResult ? `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:12px;font-weight:600;color:#111827">📝 AI Text Score</span>
            <span style="font-size:12px;font-weight:600;color:${aiBarColor}">${aiScore}%</span>
          </div>
          <div style="height:7px;background:#E5E7EB;border-radius:999px;overflow:hidden">
            <div style="height:100%;width:${aiScore}%;background:${aiBarColor};
              border-radius:999px"></div>
          </div>
        </div>
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:12px;font-weight:600;color:#111827">🔗 Context Match</span>
            <span style="font-size:12px;font-weight:600;color:#22C55E">${ctxScore}%</span>
          </div>
          <div style="height:7px;background:#E5E7EB;border-radius:999px;overflow:hidden">
            <div style="height:100%;width:${ctxScore}%;background:#22C55E;
              border-radius:999px"></div>
          </div>
        </div>` : ''}

        ${imageResult ? `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:12px;font-weight:600;color:#111827">🖼️ AI Image Score</span>
            <span style="font-size:12px;font-weight:600;color:${imgBarColor}">${imgScore}%</span>
          </div>
          <div style="height:7px;background:#E5E7EB;border-radius:999px;overflow:hidden">
            <div style="height:100%;width:${imgScore}%;background:${imgBarColor};
              border-radius:999px"></div>
          </div>
        </div>` : ''}

        ${explanation ? `
        <p style="font-size:12px;color:#6B7280;font-style:italic;
          line-height:1.5;margin:0 0 10px">
          ${explanation.substring(0, 160)}${explanation.length > 160 ? '…' : ''}
        </p>` : ''}

        ${signals.length ? `
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px">
          ${signals.map(s => `<span style="background:#F3F4F6;border-radius:6px;
            padding:3px 8px;font-size:11px;color:#6B7280">${s}</span>`).join('')}
        </div>` : ''}

        <div style="display:flex;gap:8px">
          <button id="verifai-full-report" style="flex:1;padding:10px 0;
            background:#1E3A5F;color:white;border:none;border-radius:10px;
            font-size:12px;font-weight:600;cursor:pointer;
            font-family:Inter,system-ui,sans-serif">Full Report</button>
          <button id="verifai-dismiss" style="flex:1;padding:10px 0;
            background:white;border:1.5px solid #E5E7EB;color:#374151;
            border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;
            font-family:Inter,system-ui,sans-serif">Dismiss</button>
        </div>
      </div>
    </div>`;

    document.body.appendChild(el);

    el.querySelector('#verifai-close-x').addEventListener('click', closePopup);
    el.querySelector('#verifai-dismiss').addEventListener('click', closePopup);
    el.querySelector('#verifai-full-report').addEventListener('click', () => {
      const reportData = {
        result: {
          verdict: overall >= 75 ? 'ai_generated' : overall >= 50 ? 'suspicious' : 'authentic',
          confidence:   overall,
          content_type: 'social_comment',
          scores: { ai_generated: aiScore, context_match: ctxScore, image_ai: imgScore },
          signals,
          explanation,
        },
        analyzedText: postText || 'Facebook comment',
        sourceUrl:    window.location.href,
        timestamp:    Date.now(),
        platform:     'Facebook',
      };
      _browser.storage.local.set({ fullReportData: reportData }, () => {
        _browser.runtime.sendMessage({ type: 'VERIFAI_OPEN_REPORT' });
      });
      closePopup();
    });

    setTimeout(() => {
      document.addEventListener('click', function outside(e) {
        const popup = document.getElementById('verifai-post-popup');
        if (popup && !popup.contains(e.target)) {
          closePopup();
          document.removeEventListener('click', outside);
        }
      });
    }, 200);
  }

  // ── OBSERVER ──────────────────────────────────────────────
  function scanForPosts() {
    document.querySelectorAll(`[role="article"]:not([${PROCESSED_ATTR}])`)
      .forEach(processArticle);
  }

  const observer = new MutationObserver(scanForPosts);
  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(scanForPosts, 2000);
  setTimeout(scanForPosts, 5000);

  console.log('[Verifai] Facebook detector ready');
})();
