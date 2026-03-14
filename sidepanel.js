console.log('Gemini Extension v1.8 Active - sidepanel.js');

const iframe = document.getElementById('geminiFrame');
const refreshBtn = document.getElementById('refreshBtn');
const DEFAULT_URL = "https://gemini.google.com/app";

// Restore state from storage without EVER reading iframe properties directly
chrome.storage.local.get(['lastUrl'], (result) => {
  const targetUrl = result.lastUrl || DEFAULT_URL;
  
  // Use getAttribute to avoid property access SecurityErrors
  const currentSrcAttr = iframe.getAttribute('src');
  
  if (!currentSrcAttr || currentSrcAttr === 'about:blank' || currentSrcAttr === '') {
    iframe.setAttribute('src', targetUrl);
  }
});

// Refresh button using setAttribute
refreshBtn.addEventListener('click', () => {
    const currentUrl = iframe.getAttribute('src') || DEFAULT_URL;
    iframe.setAttribute('src', currentUrl);
});

// ZERO access to iframe.contentWindow or iframe.src (property).
// This is the only way to avoid the protocols must match SecurityError.
