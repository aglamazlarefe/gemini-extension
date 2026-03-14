console.log('Gemini Extension v2.1 Active - sidepanel.js');

const iframe = document.getElementById('geminiFrame');
const refreshBtn = document.getElementById('refreshBtn');
const DEFAULT_URL = "https://gemini.google.com/app";

/**
 * ARCHITECTURE NOTE (v2.1):
 * We use a "Write-Only" approach. Reading ANY property from the iframe cross-origin
 * triggers a SecurityError. Persistence is handled by the content script reporting 
 * URL changes back to the background script.
 */

// Initial load: Restore lastGeminiUrl
chrome.storage.local.get(['lastGeminiUrl', 'lastVisitedGeminiUrl'], (result) => {
  // Use lastGeminiUrl (v2.1) with fallback to lastVisitedGeminiUrl (v2.0)
  const targetUrl = result.lastGeminiUrl || result.lastVisitedGeminiUrl || DEFAULT_URL;
  iframe.src = targetUrl;
});

// Refresh button
refreshBtn.addEventListener('click', () => {
  chrome.storage.local.get(['lastGeminiUrl'], (result) => {
      iframe.src = result.lastGeminiUrl || DEFAULT_URL;
  });
});

// NO property reads from the iframe element.
