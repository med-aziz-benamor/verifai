// Owner: Extension Lead
// File: extension/background.js
// Description: Manifest V3 service worker. Registers context menus, intercepts
//              navigation events to check URLs, and relays messages from the
//              content script to the Verifai API.

const _browser = (typeof browser !== 'undefined') ? browser : chrome;

const API_BASE = (() => {
  // Switch to production URL when not on localhost
  return 'http://localhost:8000';
})();

// ---------------------------------------------------------------------------
// Install — set up context menus
// ---------------------------------------------------------------------------
_browser.runtime.onInstalled.addListener(() => {
  // Right-click on selected text
  _browser.contextMenus.create({
    id: 'verifai-text',
    title: 'Verify with Verifai',
    contexts: ['selection'],
  });

  // Right-click on image
  _browser.contextMenus.create({
    id: 'verifai-image',
    title: 'Verify Image with Verifai',
    contexts: ['image'],
  });

  // Right-click on link
  _browser.contextMenus.create({
    id: 'verifai-link',
    title: 'Check Link with Verifai',
    contexts: ['link'],
  });

  console.log('[Verifai] Extension installed, context menus registered.');
});

// ---------------------------------------------------------------------------
// Context menu click handler
// ---------------------------------------------------------------------------
_browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === 'verifai-text' && info.selectionText) {
    const result = await analyzeText(info.selectionText);
    _browser.tabs.sendMessage(tab.id, { type: 'VERIFAI_RESULT', payload: result });
  }

  if (info.menuItemId === 'verifai-image' && info.srcUrl) {
    // Notify content script to show a loading indicator, then do a URL check as fallback
    _browser.tabs.sendMessage(tab.id, { type: 'VERIFAI_LOADING' });
    const result = await checkUrl(info.srcUrl);
    _browser.tabs.sendMessage(tab.id, { type: 'VERIFAI_RESULT', payload: result });
  }

  if (info.menuItemId === 'verifai-link' && info.linkUrl) {
    _browser.tabs.sendMessage(tab.id, { type: 'VERIFAI_LOADING' });
    const result = await checkUrl(info.linkUrl);
    _browser.tabs.sendMessage(tab.id, { type: 'VERIFAI_RESULT', payload: result });
  }
});

// ---------------------------------------------------------------------------
// Navigation listener — auto-check every page URL
// ---------------------------------------------------------------------------
_browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only fire once the page finishes loading and has a real http(s) URL
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || !tab.url.startsWith('http')) return;

  try {
    const result = await checkUrl(tab.url);

    // Store the result so the popup can read it
    await _browser.storage.local.set({
      lastUrlCheck: {
        url: tab.url,
        result,
        timestamp: Date.now(),
      },
    });

    // Push URL result to content script for banner injection
    _browser.tabs.sendMessage(tabId, {
      type: 'VERIFAI_URL_RESULT',
      payload: {
        verdict:     result.verdict,
        risk_level:  result.risk_level,
        confidence:  result.confidence,
        signals:     result.signals    || [],
        explanation: result.explanation || '',
        domain:      new URL(tab.url).hostname,
      },
    }).catch(() => {}); // content script may not be ready on all pages

    // If high-risk, badge the extension icon with a warning
    if (result.risk_level === 'high' || result.verdict === 'suspicious') {
      _browser.action.setBadgeText({ tabId, text: '!' });
      _browser.action.setBadgeBackgroundColor({ tabId, color: '#f59e0b' });
    } else {
      _browser.action.setBadgeText({ tabId, text: '' });
    }
  } catch (err) {
    console.warn('[Verifai] URL check failed:', err);
  }
});

// ---------------------------------------------------------------------------
// Message relay — content script → background → API
// ---------------------------------------------------------------------------
_browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'VERIFAI_OPEN_REPORT') {
    _browser.tabs.create({ url: _browser.runtime.getURL('report/report.html') });
    return;
  }

  if (message.type === 'VERIFAI_CHECK_TEXT') {
    analyzeText(message.text, message.page_url)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true; // keep message channel open for async response
  }

  if (message.type === 'VERIFAI_CHECK_IMAGE_BASE64') {
    analyzeImageBase64(message.image_base64, message.filename)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.type === 'VERIFAI_CHECK_URL') {
    checkUrl(message.url)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
});

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function analyzeText(text, page_url) {
  const formData = new FormData();
  formData.append('text', text);
  if (page_url) formData.append('page_url', page_url);

  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`Analyze API error: ${res.status}`);
  return res.json();
}

async function analyzeImageBase64(image_base64, filename = 'facebook_post.jpg') {
  const res = await fetch(`${API_BASE}/analyze-image-base64`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64, filename }),
  });
  if (!res.ok) throw new Error(`Image analysis API error: ${res.status}`);
  return res.json();
}

async function checkUrl(url) {
  const res = await fetch(`${API_BASE}/url-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`URL check API error: ${res.status}`);
  return res.json();
}
