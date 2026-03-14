console.log('Gemini Extension v2.0 Active - sidepanel.js');

const iframe = document.getElementById('geminiFrame');
const refreshBtn = document.getElementById('refreshBtn');
const DEFAULT_URL = "https://gemini.google.com/app";

/**
 * ARCHITECTURE NOTE (v2.0):
 * We use a "Write-Only" approach. Reading ANY property from the iframe (src, href, etc.)
 * in a cross-origin context triggers a SecurityError in many browser versions.
 */

// Initial load: Priority to lastVisitedGeminiUrl for "Resume from where I left off"
chrome.storage.local.get(['lastVisitedGeminiUrl', 'lastUrl'], (result) => {
  // Use the specific navigation-tracked URL if available, otherwise fallback
  const targetUrl = result.lastVisitedGeminiUrl || result.lastUrl || DEFAULT_URL;
  
  // NO READ: Directly set the attribute
  iframe.src = targetUrl;
});

// Refresh button: Set the source to its current known default or refresh manually
refreshBtn.addEventListener('click', () => {
  // If we have a saved URL, refresh to that, otherwise default
  chrome.storage.local.get(['lastVisitedGeminiUrl'], (result) => {
      iframe.src = result.lastVisitedGeminiUrl || DEFAULT_URL;
  });
});

// ZERO access to iframe properties to guarantee 100% SecurityError prevention.
