console.log('Gemini Extension v1.7 Active - sidepanel.js');

const iframe = document.getElementById('geminiFrame');
const refreshBtn = document.getElementById('refreshBtn');
const DEFAULT_URL = "https://gemini.google.com/app";

// Restore state from storage
chrome.storage.local.get(['lastUrl'], (result) => {
  const targetUrl = result.lastUrl || DEFAULT_URL;
  // Use a simple check to avoid SecurityError. 
  // We only set src if it's currently empty or about:blank.
  if (!iframe.src || iframe.src === 'about:blank' || iframe.src === '') {
    iframe.src = targetUrl;
  }
});

// Refresh button
refreshBtn.addEventListener('click', () => {
    // Explicitly re-set the src to force reload without reading any property
    iframe.src = iframe.src;
});

// WARNING: DO NOT add any listeners or code that tries to access iframe.contentWindow or iframe.contentDocument.
// All DOM interactions must happen within content_script.js.
