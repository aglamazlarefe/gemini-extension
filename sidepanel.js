const iframe = document.getElementById('geminiFrame');
const refreshBtn = document.getElementById('refreshBtn');
const DEFAULT_URL = "https://gemini.google.com/app";

// Restore state from storage
chrome.storage.local.get(['lastUrl', 'lastSelectedText'], (result) => {
  if (result.lastUrl && result.lastUrl !== DEFAULT_URL) {
    iframe.src = result.lastUrl;
  }

  if (result.lastSelectedText) {
    navigator.clipboard.writeText(result.lastSelectedText).then(() => {
      chrome.storage.local.remove('lastSelectedText');
    });
  }
});

// Save URL periodically and on load
const saveUrl = () => {
  try {
    const currentUrl = iframe.contentWindow.location.href;
    if (currentUrl && currentUrl.startsWith('http')) {
      chrome.storage.local.set({ lastUrl: currentUrl });
    }
  } catch (e) {
    // Fallback: we know it's Gemini
  }
};

iframe.addEventListener('load', saveUrl);
setInterval(saveUrl, 5000);

// Refresh button
refreshBtn.addEventListener('click', () => {
  iframe.src = iframe.src;
});
