console.log('Gemini Extension: sidepanel.js v1.6 loaded');

const iframe = document.getElementById('geminiFrame');
const refreshBtn = document.getElementById('refreshBtn');
const DEFAULT_URL = "https://gemini.google.com/app";

// Restore state from storage
chrome.storage.local.get(['lastUrl'], (result) => {
  const targetUrl = result.lastUrl || DEFAULT_URL;
  // Initialize ONLY if empty to prevent reloads and SecurityErrors
  if (!iframe.src || iframe.src === 'about:blank') {
    iframe.src = targetUrl;
  }
});

// Refresh button
refreshBtn.addEventListener('click', () => {
  iframe.src = iframe.src;
});

// Avoid ALL cross-origin property reads. 
// Any logic requiring iframe URL or DOM must happen in content_script.js.
