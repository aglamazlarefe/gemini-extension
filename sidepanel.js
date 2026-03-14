console.log('Gemini Extension v1.9 Active - sidepanel.js');

const iframe = document.getElementById('geminiFrame');
const refreshBtn = document.getElementById('refreshBtn');
const DEFAULT_URL = "https://gemini.google.com/app";

/**
 * ARCHITECTURE NOTE (v1.9):
 * We use a "Write-Only" approach. Reading ANY property from the iframe (src, href, etc.)
 * in a cross-origin context triggers a SecurityError in many browser versions.
 */

// Initial load: Set the source directly from storage or default
chrome.storage.local.get(['lastUrl'], (result) => {
  const targetUrl = result.lastUrl || DEFAULT_URL;
  // NO READ: Directly set the attribute
  iframe.src = targetUrl;
});

// Refresh button: Set the source to its current known default or refresh manually
refreshBtn.addEventListener('click', () => {
  // Instead of reading iframe.src, we just reload the app
  iframe.src = DEFAULT_URL; 
});

// ZERO access to iframe properties to guarantee 100% SecurityError prevention.
