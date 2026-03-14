const iframe = document.getElementById('geminiFrame');
const refreshBtn = document.getElementById('refreshBtn');
const DEFAULT_URL = "https://gemini.google.com/app";

// Restore state from storage
chrome.storage.local.get(['lastUrl'], (result) => {
  const targetUrl = result.lastUrl || DEFAULT_URL;
  // Initialize ONLY if empty to prevent security errors from reading location or reloads
  if (!iframe.src || iframe.src === 'about:blank') {
    iframe.src = targetUrl;
  }
});

// Refresh button
refreshBtn.addEventListener('click', () => {
  // Safe reload
  iframe.src = iframe.src;
});

// Persistence logic: We can't read the URL anymore due to SecurityError, 
// so we rely on content script to report URL changes if needed, 
// OR we just keep track of the base URL for simplicity which is more robust.
// For now, removing all location.href access to fix user's reported error.
